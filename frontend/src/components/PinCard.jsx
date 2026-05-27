import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Heart, Eye, Video, Image as ImageIcon, Play } from "lucide-react";

const PinCard = ({ pin }) => {
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  if (!pin) return null;

  const owner = pin.owner;
  const ownerName = typeof owner === "object" ? owner?.name : null;
  const ownerId = typeof owner === "object" ? owner?._id : owner;
  const viewCount = Array.isArray(pin.views) ? pin.views.length : 0;
  const likeCount = Array.isArray(pin.likes) ? pin.likes.length : 0;

  return (
    <article
      className="card-hover overflow-hidden cursor-pointer group"
      onClick={() => navigate(`/pin/${pin._id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/pin/${pin._id}`)}
    >
      <div className="relative aspect-[4/5] bg-paper-dark overflow-hidden">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-stone-200 border-t-ocean-500 rounded-full animate-spin" />
          </div>
        )}
        {pin.media &&
          (pin.media.type === "image" ? (
            <img
              src={pin.media.url}
              alt={pin.title || "Pin"}
              className={`w-full h-full object-cover transition duration-500 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
            />
          ) : (
            <video
              src={pin.media.url}
              className={`w-full h-full object-cover ${loaded ? "opacity-100" : "opacity-0"}`}
              onLoadedData={() => setLoaded(true)}
              muted
              playsInline
            />
          ))}
        <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-white/90 backdrop-blur text-xs font-medium text-ink-soft flex items-center gap-1">
          {pin.media?.type === "video" ? <Video size={14} /> : <ImageIcon size={14} />}
          {pin.media?.type === "video" ? "Video" : "Photo"}
        </div>
        {pin.media?.type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lift">
              <Play size={28} className="text-ocean-700 ml-1" fill="currentColor" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-ink line-clamp-1">{pin.title || "Untitled"}</h3>
        {pin.pin && <p className="text-sm text-ink-muted mt-1 line-clamp-2">{pin.pin}</p>}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
          {ownerId ? (
            <Link
              to={`/user/${ownerId}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 min-w-0 hover:opacity-80"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ocean-400 to-fresh-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {ownerName?.slice(0, 1).toUpperCase() || "?"}
              </div>
              <span className="text-sm text-ink-soft truncate">{ownerName || "Creator"}</span>
            </Link>
          ) : (
            <span className="text-sm text-ink-faint">Unknown</span>
          )}
          <div className="flex gap-3 text-xs text-ink-muted shrink-0">
            <span className="flex items-center gap-1">
              <Heart size={14} className="text-fresh-600" />
              {likeCount}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={14} />
              {viewCount}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PinCard;
