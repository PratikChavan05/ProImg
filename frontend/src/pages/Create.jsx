import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Image as ImageIcon, X, Loader, Video as VideoIcon } from "lucide-react"; // Import VideoIcon
import { PinData } from "../context/PinContext";

const Create = () => {
  const inputRef = useRef(null);
  const [file, setFile] = useState("");
  const [filePrev, setFilePrev] = useState("");
  const [fileType, setFileType] = useState(""); // State to store file type
  const [title, setTitle] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { addPin } = PinData();
  const navigate = useNavigate();

  const handleClick = () => {
    inputRef.current.click();
  };

  const changeFileHandler = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFileType(selectedFile.type); // Set the file type

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onloadend = () => {
      setFilePrev(reader.result);
      setFile(selectedFile);
    };
  };

  const removeMedia = () => {
    setFilePrev("");
    setFile("");
    setFileType("");
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
      removeMedia();
      setTitle("");
      setPin("");
    } catch (error) {
      console.error("Failed to add pin:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Create New Post
        </h1>

        <div className="flex flex-col lg:flex-row gap-8 justify-center">
          <div className="w-full lg:w-1/2 bg-white rounded-xl shadow-md overflow-hidden">
            {filePrev ? (
              <div className="relative">
                {fileType.startsWith("image") ? (
                  <img
                    src={filePrev}
                    alt="Preview"
                    className="w-full h-auto max-h-[500px] object-contain bg-gray-100"
                  />
                ) : (
                  <video
                    src={filePrev}
                    controls
                    className="w-full h-auto max-h-[500px] object-contain bg-gray-100"
                  />
                )}
                <button
                  onClick={removeMedia}
                  className="absolute top-4 right-4 p-2 bg-gray-800 bg-opacity-70 rounded-full text-white hover:bg-opacity-90 transition"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center h-96 p-6 cursor-pointer bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 transition"
                onClick={handleClick}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={changeFileHandler}
                />
                <div className="w-16 h-16 mb-4 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-full">
                  <Upload size={24} />
                </div>
                <p className="text-gray-700 font-medium mb-2">
                  Upload an image or video
                </p>
                <p className="text-sm text-gray-500 text-center max-w-sm">
                  Choose a high-quality JPG, PNG, MP4, or MOV file
                </p>
              </div>
            )}
          </div>

          {/* Form Section */}
          <div className="w-full lg:w-1/2">
            <form
              className="bg-white p-8 rounded-xl shadow-md"
              onSubmit={addPinHandler}
            >
              <div className="mb-6">
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  placeholder="Add a title that describes your Post"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="mb-8">
                <label
                  htmlFor="pin"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="pin"
                  rows="4"
                  placeholder="Tell everyone what your post is about"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className={`w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow transition ${
                  loading || !file ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={loading || !file}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <Loader size={20} className="animate-spin mr-2" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  "Create Post"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Create;