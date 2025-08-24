import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, Heart, Eye, Video as VideoIcon, ImageIcon, PlayCircle } from "lucide-react";

const PinCard = ({ pin }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  // Safe guard against missing data
  if (!pin) return null;

  // Handle media load
  const handleMediaLoad = () => {
    setIsLoaded(true);
  };

  const handleCardClick = () => {
    navigate(`/pin/${pin._id}`);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    if (pin.media?.url) {
      const filename = pin.title
        ? `${pin.title.replace(/\s+/g, "_")}.${
            pin.media.type === "image" ? "jpg" : "mp4"
          }`
        : `download.${pin.media.type === "image" ? "jpg" : "mp4"}`;

      fetch(pin.media.url)
        .then((response) => response.blob())
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch((err) => console.error("Download error:", err));
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-102"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Media container */}
      <div className="relative pb-[100%] bg-gray-100">
        {/* Loading indicator */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
        )}

        {/* Conditional media rendering */}
        {pin.media && (
          <>
            {pin.media.type === "image" ? (
              <img
                src={pin.media.url}
                alt={pin.title || "Pin"}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  isLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={handleMediaLoad}
                onError={() => setIsLoaded(true)}
              />
            ) : (
              <video
                src={pin.media.url}
                alt={pin.title || "Pin"}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  isLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoadedData={handleMediaLoad} // Use onLoadedData for videos
                onError={() => setIsLoaded(true)}
              />
            )}

            {/* Media type icon */}
            {pin.media.type === "video" ? (
              <div className="absolute top-2 left-2 p-1 bg-gray-900 bg-opacity-70 rounded-full text-white">
                <VideoIcon size={20} />
              </div>
            ) : (
              <div className="absolute top-2 left-2 p-1 bg-gray-900 bg-opacity-70 rounded-full text-white">
                <ImageIcon size={20} />
              </div>
            )}
          </>
        )}

        <div
          className={`absolute inset-0 bg-black transition-all duration-300 flex items-end justify-between p-3 ${
            isHovered ? "bg-opacity-30 opacity-100" : "bg-opacity-0 opacity-0"
          }`}
        >
          {/* Play button overlay for videos */}
          {pin.media?.type === "video" && isHovered && (
            <div className="absolute inset-0 flex items-center justify-center">
              <PlayCircle size={64} className="text-white opacity-80" />
            </div>
          )}
          <div className="flex gap-2">
            <button
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md hover:bg-gray-100"
              onClick={handleDownload}
            >
              <Download size={16} className="text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-medium text-gray-800 truncate">
          {pin.title || "Untitled Pin"}
        </h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2 h-10">
          {pin.pin || "No description"}
        </p>

        {pin.creator && (
          <div className="flex items-center mt-3 pt-2 border-t border-gray-100">
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600 font-medium">
              {typeof pin.creator === "object" && pin.creator.name
                ? pin.creator.name.slice(0, 1).toUpperCase()
                : typeof pin.creator === "string"
                ? pin.creator.slice(0, 1).toUpperCase()
                : "U"}
            </div>
            <span className="ml-2 text-xs text-gray-700">
              {typeof pin.creator === "object" && pin.creator.name
                ? pin.creator.name
                : typeof pin.creator === "string"
                ? pin.creator
                : "User"}
            </span>
            <div className="ml-auto flex items-center text-xs text-gray-500">
              <Eye size={14} className="mr-1" />
              <span>{pin.views || 0}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PinCard;