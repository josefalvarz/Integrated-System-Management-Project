document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));

  const searchInput = document.getElementById("memberSearchInput");
  const resultsBody = document.getElementById("memberResultsBody");
  const message = document.getElementById("memberSearchMessage");

  let allMembers = [];

  // 1. Protect page: only logged-in admins can enter
  if (!loggedInUser) {
    window.location.href = "./login.html";
    return;
  }

  if (loggedInUser.role !== "admin") {
    alert("Access denied. Only administrators can access Member Search.");
    window.location.href = "./dashboard.html";
    return;
  }

  // 2. Load members from backend
  async function loadMembers() {
    try {
      const response = await fetch("/api/users", {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Could not load members.");
      }

      const data = await response.json();

      allMembers = data.users || data || [];

      displayMembers(allMembers);
    } catch (error) {
      console.error("Error loading members:", error);
      message.textContent = "Could not load members. Please check the backend server.";
      message.classList.add("error-message");
    }
  }

  // 3. Display members in table
  function displayMembers(members) {
    resultsBody.innerHTML = "";

    if (!members || members.length === 0) {
      message.textContent = "No members found.";
      message.classList.remove("error-message");
      return;
    }

    message.textContent = "";

    members.forEach((member) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${member.name || "N/A"}</td>
        <td>${member.email || "N/A"}</td>
        <td>${member.role || "member"}</td>
        <td>${member.source || "Registered"}</td>
      `;

      resultsBody.appendChild(row);
    });
  }

  // 4. Search by name, email, or role
  function searchMembers() {
    const searchValue = searchInput.value.toLowerCase().trim();

    const filteredMembers = allMembers.filter((member) => {
      const name = (member.name || "").toLowerCase();
      const email = (member.email || "").toLowerCase();
      const role = (member.role || "").toLowerCase();

      return (
        name.includes(searchValue) ||
        email.includes(searchValue) ||
        role.includes(searchValue)
      );
    });

    displayMembers(filteredMembers);
  }

  searchInput.addEventListener("input", searchMembers);

  loadMembers();
});