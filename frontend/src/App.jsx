import { useEffect, useRef, useState } from "react";
import {
  deleteDocument,
  getDocuments,
  uploadDocument,
  askDocument,
} from "./api";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("Research Chat");
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  async function loadDocuments() {
    try {
      const data = await getDocuments();
      const items = data.documents || [];
      setDocuments(items);

      setSelectedId((current) => {
        if (items.some((doc) => doc.document_id === current)) return current;
        return items[0]?.document_id || "";
      });
    } catch {
      setError(
        "Error connecting to the backend.",
      );
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function handleUpload(event) {
    event.preventDefault();
    if (!file) {
      setError("Please select a PDF file to upload.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await uploadDocument(file);
      await loadDocuments();
      setSelectedId(result.document_id);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setActiveTab("My Documents");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(documentId) {
    if (!window.confirm("Do you want to delete this document?")) return;

    setError("");
    try {
      await deleteDocument(documentId);
      if (selectedId === documentId) setAnswer(null);
      await loadDocuments();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAsk(event) {
    event.preventDefault();

    if (!selectedId) {
      setError("Please select a document from My Documents.");
      setActiveTab("My Documents");
      return;
    }

    if (!question.trim() || loading) return;

    const currentQuestion = question.trim();
    setQuestion("");
    setError("");
    setLoading(true);
    setAnswer(null);

    setMessages((previous) => [
      ...previous,
      { role: "user", content: currentQuestion },
    ]);

    try {
      const result = await askDocument(selectedId, currentQuestion);

      setAnswer(result);
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: result.answer,
          sourcePages: result.source_pages || [],
        },
      ]);
    } catch (err) {
      setError(err.message);
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: `Request failed: ${err.message}`,
          failed: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const selectedDocument = documents.find(
    (doc) => doc.document_id === selectedId,
  );

  const navItems = [
    { name: "Research Chat", icon: "✦" },
    { name: "My Documents", icon: "▤" },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✳</div>
          <div>
            <h2>Research Desk</h2>
            <p>AI-powered research</p>
          </div>
        </div>

        <button
          className="new-research"
          onClick={() => {
            setActiveTab("Research Chat");
            setQuestion("");
            setAnswer(null);
            setError("");
            setMessages([]);
          }}
        >
          <span>＋</span> New research
        </button>

        <p className="nav-label">WORKSPACE</p>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${activeTab === item.name ? "active" : ""}`}
              onClick={() => {
                setActiveTab(item.name);
                setError("");
              }}
            >
              <span>{item.icon}</span>
              {item.name}
              {item.name === "My Documents" && (
                <span className="nav-count">{documents.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          <div>
            <p>Local AI engine</p>
            <span>Research workspace</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>Workspace / {activeTab}</span>
          <div className="user-avatar">IR</div>
        </header>

        <section className="content-area">
          {error && <div className="error-banner">{error}</div>}

          {activeTab === "Research Chat" ? (
            <div className="welcome">
              <div className="eyebrow">
                <span>✳</span> YOUR PERSONAL RESEARCH ASSISTANT
              </div>

              <h1>
                Research smarter.
                <br />
                <span>Understand deeper.</span>
              </h1>

              <p className="intro">
                Ask questions about your PDFs and explore evidence-backed
                answers with source page references.
              </p>

              <form className="upload-panel" onSubmit={handleUpload}>
                <div className="upload-heading">
                  <div className="feature-icon purple">↑</div>
                  <div>
                    <h3>Add a research document</h3>
                    <p>Upload a PDF to make it searchable.</p>
                  </div>
                </div>

                <input
                  ref={fileInput}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />

                <button className="primary-button" disabled={loading}>
                  {loading ? "Please wait..." : "Upload PDF"}
                  {!loading && <span>→</span>}
                </button>
              </form>

              <form className="ask-panel" onSubmit={handleAsk}>
                <label htmlFor="research-question">Ask your document</label>
                <div className="question-row">
                  <input
                    id="research-question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder={
                      selectedDocument
                        ? `Ask about ${selectedDocument.filename}...`
                        : "Upload a PDF first, then ask a question..."
                    }
                  />
                  <button className="primary-button" disabled={loading}>
                    {loading ? "Thinking..." : "Ask AI →"}
                  </button>
                </div>

                {selectedDocument && (
                  <p className="selected-note">
                    Using: <strong>{selectedDocument.filename}</strong>
                  </p>
                )}
              </form>

              {messages.length > 0 && (
                <div className="chat-history">
                  {messages.map((message, index) => (
                    <div
                      key={`${index}-${message.role}`}
                      className={`chat-message ${message.role}`}
                    >
                      <div className="message-role">
                        {message.role === "user" ? "YOU" : "RESEARCH ASSISTANT"}
                      </div>

                      <div
                        className={
                          message.failed
                            ? "message-text failed"
                            : "message-text"
                        }
                      >
                        {message.content}
                      </div>

                      {message.sourcePages?.length > 0 && (
                        <div className="source-list">
                          <strong>Source pages</strong>
                          <div className="source-chips">
                            {message.sourcePages.map((page, pageIndex) => (
                              <span key={`${page}-${pageIndex}`}>
                                Page {page}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="chat-message assistant">
                      <div className="message-role">RESEARCH ASSISTANT</div>
                      <div className="message-text thinking">
                        <span /> <span /> <span />
                        <small>
                          Searching your document and generating an answer…
                        </small>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                className="text-button"
                onClick={() => setActiveTab("My Documents")}
              >
                Browse your document library →
              </button>
            </div>
          ) : (
            <div className="library">
              <div className="library-heading">
                <div>
                  <div className="eyebrow">YOUR WORKSPACE</div>
                  <h1>My Documents</h1>
                  <p className="intro">
                    Your indexed research PDFs, ready to explore.
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setActiveTab("Research Chat")}
                >
                  + Add PDF
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="empty-state">
                  <div className="feature-icon purple large">▤</div>
                  <h3>No documents yet</h3>
                  <p>Upload a PDF to start building your research library.</p>
                  <button
                    className="primary-button"
                    onClick={() => setActiveTab("Research Chat")}
                  >
                    Upload your first PDF →
                  </button>
                </div>
              ) : (
                <div className="document-list">
                  {documents.map((doc) => (
                    <div className="document-card" key={doc.document_id}>
                      <div className="pdf-icon">PDF</div>
                      <div className="document-info">
                        <h3>{doc.filename}</h3>
                        <p>{doc.chunk_count} searchable chunks</p>
                      </div>
                      <button
                        className="select-button"
                        onClick={() => {
                          setSelectedId(doc.document_id);
                          setAnswer(null);
                          setActiveTab("Research Chat");
                        }}
                      >
                        Research
                      </button>
                      <button
                        className="delete-button"
                        aria-label={`Delete ${doc.filename}`}
                        onClick={() => handleDelete(doc.document_id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <footer>
          <span>AI RESEARCH DESK &copy; IbadDotCom</span>
          <span>Built for curious minds.</span>
        </footer>
      </main>
    </div>
  );
}
