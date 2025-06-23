const baseUrl = "http://localhost:3000/posts";
let currentPost = null;
let allPosts = [];
let showingTrash = false;

// 🔔 Show popup notification
function showNotification(message) {
  const note = document.getElementById("notification");
  note.textContent = message;
  note.classList.remove("hidden");
  setTimeout(() => note.classList.add("hidden"), 2500);
}

// 🗂️ Display posts based on current view
function displayPosts(filteredPosts = null) {
  const postList = document.getElementById("post-list");
  postList.innerHTML = "";

  let postsToRender = filteredPosts || allPosts;
  postsToRender = postsToRender.filter(post => showingTrash ? post.deleted : !post.deleted);

  postsToRender.forEach((post, index) => {
    const postEl = document.createElement("div");
    postEl.textContent = post.title;
    postEl.classList.add("post-item");
    postEl.dataset.id = post.id;

    postEl.addEventListener("click", () => handlePostClick(post.id));
    postList.appendChild(postEl);

    if (index === 0 && !filteredPosts) handlePostClick(post.id);
  });
}

// 🔁 Fetch all posts and refresh the view
function refreshAllPosts() {
  fetch(baseUrl)
    .then(res => res.json())
    .then(posts => {
      allPosts = posts;
      displayPosts();
      document.getElementById("post-detail").innerHTML = "<p>Select a post to view details.</p>";
    });
}

// 📄 Show single post
function handlePostClick(postId) {
  fetch(`${baseUrl}/${postId}`)
    .then(res => res.json())
    .then(post => {
      currentPost = post;
      const postDetail = document.getElementById("post-detail");
      postDetail.innerHTML = `
        <h2>${post.title}</h2>
        ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-img" />` : ""}
        <p>${post.content}</p>
        <p><em>Author: ${post.author}</em></p>
      `;

      if (post.deleted) {
        postDetail.innerHTML += `
          <button id="restore-btn">♻️ Restore</button>
          <button id="permanent-delete-btn">❌ Delete Forever</button>
        `;
        document.getElementById("restore-btn").addEventListener("click", () => {
          fetch(`${baseUrl}/${post.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deleted: false, deletedAt: null })
          }).then(() => {
            showNotification("✅ Post restored!");
            refreshAllPosts();
          });
        });

        document.getElementById("permanent-delete-btn").addEventListener("click", () => {
          if (!confirm("This will permanently delete the post. Are you sure?")) return;
          fetch(`${baseUrl}/${post.id}`, { method: "DELETE" }).then(() => {
            showNotification("🗑️ Post permanently deleted!");
            refreshAllPosts();
          });
        });
      } else {
        postDetail.innerHTML += `
          <button id="edit-btn">✏️ Edit</button>
          <button id="delete-btn">🗑️ Delete</button>
        `;
        document.getElementById("edit-btn").addEventListener("click", showEditForm);
        document.getElementById("delete-btn").addEventListener("click", deleteCurrentPost);
      }
    });
}

// ➕ Add new post
function addNewPostListener() {
  const form = document.getElementById("new-post-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("new-title").value.trim();
    const content = document.getElementById("new-content").value.trim();
    const author = document.getElementById("new-author").value.trim();
    if (!title || !content || !author) return;

    const newPost = { title, content, author };
    fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPost)
    })
      .then(res => res.json())
      .then(() => {
        form.reset();
        refreshAllPosts();
        showNotification("✅ New post added!");
      });
  });
}

// ✏️ Show and handle edit form
function showEditForm() {
  const form = document.getElementById("edit-post-form");
  form.classList.remove("hidden");
  document.getElementById("edit-title").value = currentPost.title;
  document.getElementById("edit-content").value = currentPost.content;
}

document.getElementById("cancel-edit").addEventListener("click", () => {
  document.getElementById("edit-post-form").classList.add("hidden");
});

document.getElementById("edit-post-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const updatedPost = {
    title: document.getElementById("edit-title").value,
    content: document.getElementById("edit-content").value
  };

  fetch(`${baseUrl}/${currentPost.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedPost)
  })
    .then(res => res.json())
    .then(post => {
      currentPost = post;
      document.getElementById("edit-post-form").classList.add("hidden");
      refreshAllPosts();
      handlePostClick(post.id);
      showNotification("✅ Post updated!");
    });
});

// 🗑️ Soft delete post
function deleteCurrentPost() {
  if (!confirm("Are you sure you want to delete this post?")) return;

  fetch(`${baseUrl}/${currentPost.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deleted: true, deletedAt: new Date().toISOString() })
  }).then(() => {
    currentPost = null;
    refreshAllPosts();
    showNotification("🗑️ Post moved to Recycle Bin!");
  });
}

// 🔍 Search & Sort
function setupSearchAndSort() {
  const searchInput = document.getElementById("search");
  const sortSelect = document.getElementById("sort");

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    const postsToSearch = showingTrash
      ? allPosts.filter(p => p.deleted)
      : allPosts.filter(p => !p.deleted);

    const filtered = postsToSearch.filter(post =>
      post.title.toLowerCase().includes(term) ||
      post.content.toLowerCase().includes(term) ||
      post.author.toLowerCase().includes(term)
    );
    displayPosts(filtered);
  });

  sortSelect.addEventListener("change", () => {
    const sortBy = sortSelect.value;
    const postsToSort = showingTrash
      ? allPosts.filter(p => p.deleted)
      : allPosts.filter(p => !p.deleted);

    const sorted = [...postsToSort].sort((a, b) =>
      a[sortBy].toLowerCase().localeCompare(b[sortBy].toLowerCase())
    );
    displayPosts(sorted);
  });
}

// 🌗 Theme toggle
document.getElementById("toggle-theme").addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

// 🔁 App init
function main() {
  fetch(baseUrl)
    .then(res => res.json())
    .then(posts => {
      allPosts = posts;
      displayPosts();
    });

  addNewPostListener();
  setupSearchAndSort();
}

// 🗑️ Recycle bin toggle
document.addEventListener("DOMContentLoaded", () => {
  const viewTrashBtn = document.getElementById("view-trash");
  const viewActiveBtn = document.getElementById("view-active");

  viewTrashBtn.addEventListener("click", () => {
    showingTrash = true;
    displayPosts();
    document.getElementById("post-detail").innerHTML = "<p>Select a post to view details.</p>";
    viewTrashBtn.classList.add("hidden");
    viewActiveBtn.classList.remove("hidden");
  });

  viewActiveBtn.addEventListener("click", () => {
    showingTrash = false;
    displayPosts();
    document.getElementById("post-detail").innerHTML = "<p>Select a post to view details.</p>";
    viewActiveBtn.classList.add("hidden");
    viewTrashBtn.classList.remove("hidden");
  });

  main();
});
