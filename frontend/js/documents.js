const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

if (!loggedInUser) {
  window.location.href = 'login.html';
}

const documentsKey = 'organizationDocuments';

const adminUploadSection = document.getElementById('adminUploadSection');
const documentForm = document.getElementById('documentForm');
const documentTitle = document.getElementById('documentTitle');
const documentDescription = document.getElementById('documentDescription');
const documentCategory = document.getElementById('documentCategory');
const documentFile = document.getElementById('documentFile');
const documentMessage = document.getElementById('documentMessage');
const documentsTableBody = document.getElementById('documentsTableBody');
const emptyDocumentsMessage = document.getElementById('emptyDocumentsMessage');
const documentSearch = document.getElementById('documentSearch');

initializeDocumentPage();

function initializeDocumentPage() {
  loadUserInfo();
  applyRoleAccess();
  setupEvents();
  renderDocuments();
}

function loadUserInfo() {
  const name = loggedInUser.name || loggedInUser.email || 'User';
  const role = loggedInUser.role || 'member';

  const userName = document.getElementById('userName');
  const userRole = document.getElementById('userRole');
  const userInitials = document.getElementById('userInitials');

  if (userName) {
    userName.textContent = name;
  }

  if (userRole) {
    userRole.textContent = role === 'admin' ? 'Administrator' : 'Member';
  }

  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  if (userInitials) {
    userInitials.textContent = initials || 'U';
  }
}

function isAdmin() {
  return loggedInUser && loggedInUser.role === 'admin';
}

function applyRoleAccess() {
  if (!isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(element => {
      element.style.display = 'none';
    });

    if (adminUploadSection) {
      adminUploadSection.style.display = 'none';
    }
  }
}

function setupEvents() {
  if (documentForm) {
    documentForm.addEventListener('submit', handleDocumentUpload);
  }

  if (documentSearch) {
    documentSearch.addEventListener('input', function () {
      renderDocuments(documentSearch.value);
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

function getDocuments() {
  const storedDocuments = localStorage.getItem(documentsKey);

  if (!storedDocuments) {
    return [];
  }

  return JSON.parse(storedDocuments);
}

function saveDocuments(documents) {
  localStorage.setItem(documentsKey, JSON.stringify(documents));
}

function generateDocumentId() {
  return 'doc-' + Date.now();
}

function formatDate(dateText) {
  const date = new Date(dateText);

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function showMessage(message, type) {
  if (!documentMessage) return;

  documentMessage.textContent = message;
  documentMessage.className = 'documents-message ' + type;

  setTimeout(function () {
    documentMessage.textContent = '';
    documentMessage.className = 'documents-message';
  }, 3000);
}

function convertFileToBase64(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();

    reader.onload = function () {
      resolve(reader.result);
    };

    reader.onerror = function () {
      reject('Could not read file.');
    };

    reader.readAsDataURL(file);
  });
}

async function handleDocumentUpload(event) {
  event.preventDefault();

  if (!isAdmin()) {
    showMessage('Only administrators can upload documents.', 'error');
    return;
  }

  const selectedFile = documentFile.files[0];

  if (!selectedFile) {
    showMessage('Please select a file.', 'error');
    return;
  }

  const maxFileSize = 2 * 1024 * 1024;

  if (selectedFile.size > maxFileSize) {
    showMessage('File is too large. Please upload a file smaller than 2MB for this frontend demo.', 'error');
    return;
  }

  try {
    const fileData = await convertFileToBase64(selectedFile);

    const documents = getDocuments();

    const newDocument = {
      id: generateDocumentId(),
      title: documentTitle.value.trim(),
      description: documentDescription.value.trim(),
      category: documentCategory.value,
      fileName: selectedFile.name,
      fileType: selectedFile.type || 'application/octet-stream',
      fileSize: selectedFile.size,
      fileData: fileData,
      uploadedBy: loggedInUser.name || loggedInUser.email || 'Admin',
      uploadedAt: new Date().toISOString()
    };

    documents.push(newDocument);
    saveDocuments(documents);

    documentForm.reset();
    showMessage('Document uploaded successfully.', 'success');
    renderDocuments();
  } catch (error) {
    showMessage('Could not upload document.', 'error');
  }
}

function renderDocuments(filterText = '') {
  const documents = getDocuments();

  documentsTableBody.innerHTML = '';

  const searchValue = filterText.toLowerCase().trim();

  const filteredDocuments = documents.filter(function (documentItem) {
    const title = documentItem.title.toLowerCase();
    const description = documentItem.description.toLowerCase();
    const category = documentItem.category.toLowerCase();
    const fileName = documentItem.fileName.toLowerCase();

    return (
      title.includes(searchValue) ||
      description.includes(searchValue) ||
      category.includes(searchValue) ||
      fileName.includes(searchValue)
    );
  });

  if (filteredDocuments.length === 0) {
    emptyDocumentsMessage.style.display = 'block';
    return;
  }

  emptyDocumentsMessage.style.display = 'none';

  filteredDocuments.forEach(function (documentItem) {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${documentItem.title}</td>
      <td>${documentItem.description}</td>
      <td>${documentItem.category}</td>
      <td>${documentItem.fileName}</td>
      <td>${documentItem.uploadedBy}</td>
      <td>${formatDate(documentItem.uploadedAt)}</td>
      <td>
        <button class="table-action-btn document-action-btn" onclick="viewDocument('${documentItem.id}')">
          View
        </button>

        <button class="table-action-btn document-action-btn" onclick="downloadDocument('${documentItem.id}')">
          Download
        </button>

        ${
          isAdmin()
            ? `<button class="table-action-btn document-action-btn document-danger-btn" onclick="deleteDocument('${documentItem.id}')">
                Delete
              </button>`
            : ''
        }
      </td>
    `;

    documentsTableBody.appendChild(row);
  });
}

function viewDocument(documentId) {
  const documents = getDocuments();

  const selectedDocument = documents.find(function (documentItem) {
    return documentItem.id === documentId;
  });

  if (!selectedDocument) {
    alert('Document not found.');
    return;
  }

  if (!selectedDocument.fileData) {
    alert('This document was uploaded with the old simulation version. Please delete it and upload it again.');
    return;
  }

  const newTab = window.open('', '_blank');

  if (!newTab) {
    alert('Please allow pop-ups to view the document.');
    return;
  }

  const fileType = selectedDocument.fileType || '';
  const fileName = selectedDocument.fileName || 'Document';

  if (fileType.startsWith('image/')) {
    newTab.document.write(`<!DOCTYPE html>
<html>
<head><title>${fileName}</title></head>
<body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#111;">
  <img src="${selectedDocument.fileData}" style="max-width:100%;max-height:100vh;" />
</body>
</html>`);
    newTab.document.close();
    return;
  }

  if (fileType === 'application/pdf') {
    newTab.location.href = selectedDocument.fileData;
    return;
  }

  if (fileType === 'text/plain') {
    newTab.document.write(`<!DOCTYPE html>
<html>
<head><title>${fileName}</title></head>
<body style="margin:0;">
  <iframe src="${selectedDocument.fileData}" style="width:100%;height:100vh;border:none;"></iframe>
</body>
</html>`);
    newTab.document.close();
    return;
  }

  const isWordDoc =
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword' ||
    /\.docx?$/i.test(fileName);

  if (isWordDoc) {
    const base64 = selectedDocument.fileData.split(',')[1];

    newTab.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${fileName}</title>
  <script src="https://cdn.jsdelivr.net/npm/mammoth@1/mammoth.browser.min.js"><\/script>
  <style>
    body { margin: 0; padding: 24px; background: #f0f0f0; font-family: sans-serif; }
    #loading { text-align: center; padding: 40px; color: #555; font-size: 15px; }
    #docx-container { background: white; max-width: 870px; margin: 0 auto; padding: 40px; min-height: 100vh; box-shadow: 0 2px 10px rgba(0,0,0,.2); line-height: 1.6; word-wrap: break-word; display: none; }
  </style>
</head>
<body>
  <p id="loading">Loading document...</p>
  <div id="docx-container"></div>
  <script>
    (function () {
      try {
        const b64 = '${base64}';
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
          .then(function (result) {
            const container = document.getElementById('docx-container');
            container.innerHTML = result.value;
            container.style.display = 'block';
            document.getElementById('loading').style.display = 'none';
          })
          .catch(function () {
            document.getElementById('loading').textContent = 'Could not render this document. Please use the Download button.';
          });
      } catch (e) {
        document.getElementById('loading').textContent = 'Could not render this document. Please use the Download button.';
      }
    })();
  <\/script>
</body>
</html>`);
    newTab.document.close();
    return;
  }

  newTab.close();
  alert('This file type cannot be previewed in the browser. Please use the Download button instead.');
}

function downloadDocument(documentId) {
  const documents = getDocuments();

  const selectedDocument = documents.find(function (documentItem) {
    return documentItem.id === documentId;
  });

  if (!selectedDocument) {
    alert('Document not found.');
    return;
  }

  if (!selectedDocument.fileData) {
    alert('This document was uploaded with the old simulation version. Please delete it and upload it again.');
    return;
  }

  const downloadLink = document.createElement('a');
  downloadLink.href = selectedDocument.fileData;
  downloadLink.download = selectedDocument.fileName;
  downloadLink.click();
}

function deleteDocument(documentId) {
  if (!isAdmin()) {
    alert('Only administrators can delete documents.');
    return;
  }

  const confirmDelete = confirm('Are you sure you want to delete this document?');

  if (!confirmDelete) {
    return;
  }

  const documents = getDocuments();

  const updatedDocuments = documents.filter(function (documentItem) {
    return documentItem.id !== documentId;
  });

  saveDocuments(updatedDocuments);
  renderDocuments(documentSearch.value);
}

function logout() {
  window.location.href = 'logout.html';
}