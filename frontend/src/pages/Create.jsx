import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, Loader } from "lucide-react";
import { PinData } from "../context/PinContext";

const Create = () => {
  const inputRef = useRef(null);
  const [file, setFile] = useState("");
  const [filePrev, setFilePrev] = useState("");
  const [fileType, setFileType] = useState("");
  const [title, setTitle] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { addPin } = PinData();
  const navigate = useNavigate();

  const changeFileHandler = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFileType(selected.type);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePrev(reader.result);
      setFile(selected);
    };
    reader.readAsDataURL(selected);
  };

  const addPinHandler = async (e) => {
    e.preventDefault();
    if (!file || !title || !pin) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("pin", pin);
    formData.append("file", file);
    try {
      await addPin(formData, navigate);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-container max-w-4xl">
        <header className="mb-8 text-center md:text-left">
          <h1 className="section-title">Create a pin</h1>
          <p className="section-sub">Upload a photo or video and add a short description.</p>
        </header>

        <form onSubmit={addPinHandler} className="space-y-6">
          <div className="card overflow-hidden">
            {filePrev ? (
              <div className="relative bg-paper-dark">
                {fileType.startsWith("image") ? (
                  <img src={filePrev} alt="Preview" className="w-full max-h-[420px] object-contain mx-auto" />
                ) : (
                  <video src={filePrev} controls className="w-full max-h-[420px] mx-auto" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFilePrev("");
                    setFile("");
                    setFileType("");
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white shadow-soft hover:bg-red-50 text-ink-muted"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-full py-16 px-6 flex flex-col items-center gap-3 border-2 border-dashed border-stone-200 hover:border-ocean-300 hover:bg-ocean-50/50 transition rounded-2xl"
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={changeFileHandler}
                  />
                  <div className="w-14 h-14 rounded-2xl bg-ocean-100 text-ocean-700 flex items-center justify-center">
                    <Upload size={28} />
                  </div>
                  <span className="font-medium text-ink">Tap to upload</span>
                  <span className="text-sm text-ink-muted">JPG, PNG, MP4, or MOV</span>
                </button>
              </div>
            )}
          </div>

          <div className="card p-6 space-y-4">
            <div>
              <label htmlFor="title" className="auth-label">
                Title
              </label>
              <input
                id="title"
                className="input-field"
                placeholder="What is this about?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="pin" className="auth-label">
                Description
              </label>
              <textarea
                id="pin"
                rows={4}
                className="input-field resize-none"
                placeholder="Add details, tips, or a story…"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading || !file}>
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" /> Publishing…
                </>
              ) : (
                "Publish pin"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Create;
