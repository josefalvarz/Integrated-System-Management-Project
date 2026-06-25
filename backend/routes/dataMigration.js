const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const db = require("../db");

const router = express.Router();

const uploadFolder = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    const safeFileName = Date.now() + "-" + file.originalname;
    cb(null, safeFileName);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: function (req, file, cb) {
    const allowedExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV and Excel files are allowed."));
    }
  },
});

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) {
        reject(error);
      } else {
        resolve(this);
      }
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function (error, row) {
      if (error) {
        reject(error);
      } else {
        resolve(row);
      }
    });
  });
}

function createImportedMembersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS imported_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      joined TEXT,
      imported_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `;

  return runQuery(sql);
}

function requireAdmin(req, res, next) {
  const userRole = req.headers["x-user-role"];

  if (!userRole || userRole.toLowerCase() !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only administrators can import member data.",
    });
  }

  next();
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function cleanText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function cleanEmail(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim().toLowerCase();
}

function getFieldValue(row, possibleNames) {
  const rowKeys = Object.keys(row);

  for (const possibleName of possibleNames) {
    const matchedKey = rowKeys.find(
      (key) => key.trim().toLowerCase() === possibleName.trim().toLowerCase()
    );

    if (matchedKey) {
      return row[matchedKey];
    }
  }

  return "";
}

function normalizeRow(row) {
  return {
    name: cleanText(getFieldValue(row, ["name", "full name", "member name"])),
    email: cleanEmail(getFieldValue(row, ["email", "email address"])),
    phone: cleanText(getFieldValue(row, ["phone", "phone number", "mobile"])),
    joined: cleanText(getFieldValue(row, ["joined", "join date", "date joined"])),
  };
}

function validateRow(row) {
  const errors = [];

  if (!row.name) {
    errors.push("Missing required field: name");
  }

  if (!row.email) {
    errors.push("Missing required field: email");
  } else if (!isValidEmail(row.email)) {
    errors.push("Invalid email format");
  }

  return errors;
}

function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", function (data) {
        rows.push(data);
      })
      .on("end", function () {
        resolve(rows);
      })
      .on("error", function (error) {
        reject(error);
      });
  });
}

function parseExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  return XLSX.utils.sheet_to_json(worksheet);
}

async function parseUploadedFile(filePath, originalFileName) {
  const extension = path.extname(originalFileName).toLowerCase();

  if (extension === ".csv") {
    return await parseCsvFile(filePath);
  }

  if (extension === ".xlsx" || extension === ".xls") {
    return parseExcelFile(filePath);
  }

  throw new Error("Unsupported file type.");
}

function deleteUploadedFile(req) {
  if (req.file && fs.existsSync(req.file.path)) {
    fs.unlinkSync(req.file.path);
  }
}

async function buildPreview(rawRows) {
  await createImportedMembersTable();

  // Capture column headers in the order they appear in the CSV
  const columns = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];

  const preview = {
    totalRows: rawRows.length,
    validRows: 0,
    invalidRows: 0,
    duplicateRows: 0,
    validRecords: [],
    invalidRecords: [],
    columns,
  };

  const emailsInsideFile = new Set();

  for (let index = 0; index < rawRows.length; index++) {
    const rowNumber = index + 2;
    const rawRow = rawRows[index];
    const cleanedRow = normalizeRow(rawRow);
    const validationErrors = validateRow(cleanedRow);

    if (validationErrors.length > 0) {
      preview.invalidRows++;

      preview.invalidRecords.push({
        row: rowNumber,
        name: cleanedRow.name || "N/A",
        email: cleanedRow.email || "N/A",
        errors: validationErrors,
      });

      continue;
    }

    if (emailsInsideFile.has(cleanedRow.email)) {
      preview.duplicateRows++;

      preview.invalidRecords.push({
        row: rowNumber,
        name: cleanedRow.name,
        email: cleanedRow.email,
        errors: ["Duplicate email inside uploaded file"],
      });

      continue;
    }

    emailsInsideFile.add(cleanedRow.email);

    const existingMember = await getQuery(
      "SELECT id FROM imported_members WHERE email = ?",
      [cleanedRow.email]
    );

    if (existingMember) {
      preview.duplicateRows++;

      preview.invalidRecords.push({
        row: rowNumber,
        name: cleanedRow.name,
        email: cleanedRow.email,
        errors: ["Duplicate email already exists in database"],
      });

      continue;
    }

    preview.validRows++;

    preview.validRecords.push({
      name: cleanedRow.name,
      email: cleanedRow.email,
      phone: cleanedRow.phone,
      joined: cleanedRow.joined,
      _originalRow: rawRow,
    });
  }

  return preview;
}

router.post(
  "/preview",
  requireAdmin,
  upload.single("memberFile"),
  async function (req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded.",
        });
      }

      const rawRows = await parseUploadedFile(
        req.file.path,
        req.file.originalname
      );

      const preview = await buildPreview(rawRows);

      deleteUploadedFile(req);

      return res.status(200).json({
        success: true,
        message: "Preview generated successfully.",
        preview: preview,
      });
    } catch (error) {
      console.error("Data migration preview error:", error);

      deleteUploadedFile(req);

      return res.status(500).json({
        success: false,
        message: "Preview failed.",
        error: error.message,
      });
    }
  }
);

router.post(
  "/confirm-import",
  requireAdmin,
  async function (req, res) {
    try {
      await createImportedMembersTable();

      const validRecords = req.body.validRecords;

      if (!Array.isArray(validRecords) || validRecords.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid records were provided for import.",
        });
      }

      const summary = {
        totalRows: validRecords.length,
        importedRows: 0,
        invalidRows: 0,
        duplicateRows: 0,
        failedRows: [],
        importedRecords: [],
      };

      const emailsInsideRequest = new Set();

      for (let index = 0; index < validRecords.length; index++) {
        const rowNumber = index + 1;
        const cleanedRow = {
          name: cleanText(validRecords[index].name),
          email: cleanEmail(validRecords[index].email),
          phone: cleanText(validRecords[index].phone),
          joined: cleanText(validRecords[index].joined),
        };

        const validationErrors = validateRow(cleanedRow);

        if (validationErrors.length > 0) {
          summary.invalidRows++;

          summary.failedRows.push({
            row: rowNumber,
            name: cleanedRow.name || "N/A",
            email: cleanedRow.email || "N/A",
            errors: validationErrors,
          });

          continue;
        }

        if (emailsInsideRequest.has(cleanedRow.email)) {
          summary.duplicateRows++;

          summary.failedRows.push({
            row: rowNumber,
            name: cleanedRow.name,
            email: cleanedRow.email,
            errors: ["Duplicate email inside confirmed records"],
          });

          continue;
        }

        emailsInsideRequest.add(cleanedRow.email);

        const existingMember = await getQuery(
          "SELECT id FROM imported_members WHERE email = ?",
          [cleanedRow.email]
        );

        if (existingMember) {
          summary.duplicateRows++;

          summary.failedRows.push({
            row: rowNumber,
            name: cleanedRow.name,
            email: cleanedRow.email,
            errors: ["Duplicate email already exists in database"],
          });

          continue;
        }

        await runQuery(
          `
          INSERT INTO imported_members (name, email, phone, joined)
          VALUES (?, ?, ?, ?)
          `,
          [
            cleanedRow.name,
            cleanedRow.email,
            cleanedRow.phone,
            cleanedRow.joined,
          ]
        );

        summary.importedRows++;

        summary.importedRecords.push({
          name: cleanedRow.name,
          email: cleanedRow.email,
          phone: cleanedRow.phone,
          joined: cleanedRow.joined,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Import confirmed successfully.",
        summary: summary,
      });
    } catch (error) {
      console.error("Confirm import error:", error);

      return res.status(500).json({
        success: false,
        message: "Import failed.",
        error: error.message,
      });
    }
  }
);

/*
  Legacy route preserved.
  This keeps the previous import endpoint available in case another part
  of the project still depends on it.
*/
router.post(
  "/import",
  requireAdmin,
  upload.single("memberFile"),
  async function (req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded.",
        });
      }

      const rawRows = await parseUploadedFile(
        req.file.path,
        req.file.originalname
      );

      const preview = await buildPreview(rawRows);

      const summary = {
        totalRows: preview.totalRows,
        importedRows: 0,
        invalidRows: preview.invalidRows,
        duplicateRows: preview.duplicateRows,
        failedRows: preview.invalidRecords,
        importedRecords: [],
      };

      for (const record of preview.validRecords) {
        await runQuery(
          `
          INSERT INTO imported_members (name, email, phone, joined)
          VALUES (?, ?, ?, ?)
          `,
          [record.name, record.email, record.phone, record.joined]
        );

        summary.importedRows++;

        summary.importedRecords.push({
          name: record.name,
          email: record.email,
          phone: record.phone,
          joined: record.joined,
        });
      }

      deleteUploadedFile(req);

      return res.status(200).json({
        success: true,
        message: "Import completed.",
        summary: summary,
      });
    } catch (error) {
      console.error("Data migration error:", error);

      deleteUploadedFile(req);

      return res.status(500).json({
        success: false,
        message: "Import failed.",
        error: error.message,
      });
    }
  }
);

module.exports = router;