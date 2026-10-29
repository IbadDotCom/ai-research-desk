
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function getDocuments() {
  const response = await fetch(`${API_BASE}/documents`);

  if (!response.ok) {
    throw new Error("Documents load failed.");
  }

  return response.json();
}

export async function deleteDocument(documentId) {
  const response = await fetch(
    `${API_BASE}/documents/${documentId}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    throw new Error("Document delete failed.");
  }

  return response.json();
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/documents/index`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "PDF upload failed.");
  }

  return data;
}

export async function askDocument(documentId, query) {
  const response = await fetch(
    `${API_BASE}/documents/${documentId}/ask`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, top_k: 5 }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Answer not found.");
  }

  return data;
}
