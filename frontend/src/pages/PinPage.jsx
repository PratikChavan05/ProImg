
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PinData } from "../context/PinContext";
import customAxios from "../config/axios";
import PinCard from "../components/PinCard";
import {
  Trash2,
  Edit,
  Send,
  UserCircle,
  Heart,
  Download,
  Share2,
  Clock,
  MessageSquare,
  AlertCircle,
  ChevronLeft,
  BookmarkPlus,
  Eye,
  ThumbsUp,
  ExternalLink,
  Image,
  Video, 
  Lock,
  X,
} from "lucide-react";

const PinPage = ({ user }) => {
  const params = useParams();
  const navigate = useNavigate();

  const {
    loading,
    fetchPin,
    pin,
    updatePin,
    addComment,
    deleteComment,
    deletePin,
    likePin,
    recordView,
  } = PinData();

  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false); // Renamed from showImageModal
  const [commentSorting, setCommentSorting] = useState("newest");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [relatedPins, setRelatedPins] = useState([]);


  useEffect(() => {
    if (pin && Array.isArray(pin.likes) && user?._id) {
      setLiked(pin.likes.includes(user._id));
    } else {
      setLiked(false);
    }
  }, [pin, user?._id]);

  useEffect(() => {
    if (params.id) {
      setError(null);
      fetchPin(params.id).catch((err) =>
        setError(err?.message || "Failed to load pin details")
      );
      recordView(params.id);
    }
  }, [params.id]);

  useEffect(() => {
    if (pin) {
      setTitle(pin.title || "");
      setPinValue(pin.pin || "");
    }
  }, [pin]);

  useEffect(() => {
    const fetchSimilarPins = async () => {
      if (params.id) {
        try {
          const { data } = await customAxios.get(`/api/pin/${params.id}/similar`);
          // Map Elasticsearch flat structure to expected Pin media schema
          const mappedPins = (Array.isArray(data) ? data : []).map(pin => {
            if (pin.mediaUrl && !pin.media) {
              return {
                ...pin,
                media: {
                  url: pin.mediaUrl,
                  type: pin.mediaType || "image"
                }
              };
            }
            return pin;
          });
          setRelatedPins(mappedPins);
        } catch (err) {
          console.error("Error fetching visually similar pins:", err);
          setRelatedPins([]);
        }
      }
    };
    fetchSimilarPins();
  }, [params.id]);

  const editHandler = () => {
    setEdit(!edit);
  };

  const updateHandler = () => {
    if (!title.trim()) {
      setError("Title cannot be empty");
      return;
    }

    try {
      updatePin(pin._id, title, pinValue, setEdit);
    } catch (err) {
      setError(err?.message || "Failed to update pin");
    }
  };

  const submitHandler = (e) => {
    e.preventDefault();
    if (comment.trim()) {
      try {
        addComment(pin._id, comment, setComment);
      } catch (err) {
        setError(err?.message || "Failed to add comment");
      }
    }
  };

  const deleteCommentHandler = (id) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      try {
        deleteComment(pin._id, id);
      } catch (err) {
        setError(err?.message || "Failed to delete comment");
      }
    }
  };

  const deletePinHandler = () => {
    try {
      deletePin(pin._id, navigate);
      setConfirmDelete(false);
    } catch (err) {
      setError(err?.message || "Failed to delete pin");
    }
  };

  const likeHandler = () => {
    if (!user?._id) {
      navigate("/login");
      return;
    }
    try {
      likePin(pin._id);
      setLiked(!liked);
    } catch (err) {
      setError(err?.message || "Failed to like pin");
    }
  };

  const bookmarkHandler = () => {
    if (!user?._id) {
      navigate("/login");
      return;
    }
    setBookmarked(!bookmarked);
    const message = bookmarked
      ? "Removed from your saved collection"
      : "Saved to your collection";

    alert(message);
  };

  const sortComments = (comments) => {
    if (!comments || !Array.isArray(comments)) return [];

    const sortedComments = [...comments];

    if (commentSorting === "newest") {
      return sortedComments.reverse();
    } else if (commentSorting === "oldest") {
      return sortedComments;
    }

    return sortedComments;
  };

  const Loading = () => (
    <div className="page-shell flex flex-col items-center justify-center min-h-[50vh]">
      <div className="w-12 h-12 border-4 border-paper-200 border-t-ocean-500 rounded-full animate-spin mb-4" />
      <p className="text-ink-muted font-medium">Loading pin…</p>
    </div>
  );

  const ErrorDisplay = () => (
    <div className="page-shell flex flex-col items-center justify-center min-h-[50vh]">
      <AlertCircle size={40} className="mb-4 text-red-500" />
      <p className="text-red-600 font-medium mb-4">{error}</p>
      <button type="button" onClick={() => window.location.reload()} className="btn-secondary">
        Try again
      </button>
    </div>
  );

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorDisplay />;
  }

  if (!pin) {
    return (
      <div className="page-shell flex flex-col items-center justify-center min-h-[50vh]">
        <AlertCircle size={40} className="mb-4 text-amber-500" />
        <p className="text-ink font-medium text-xl mb-4">Pin not found or was deleted</p>
        <button type="button" onClick={() => navigate("/")} className="btn-primary">
          Go home
        </button>
      </div>
    );
  }

  const isOwner = pin.owner && user && pin.owner._id === user._id;

  const formattedDate = pin.createdAt
    ? new Date(pin.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const viewCount = Array.isArray(pin.views)
    ? pin.views.length
    : (pin.views ?? pin.viewCount ?? 0);

  return (
    <div className="page-shell pb-12">
      <div className="page-container max-w-6xl">
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost !pl-0 mb-4 flex items-center gap-1">
          <ChevronLeft size={20} />
          Back
        </button>

        <div className="card overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            <div className="w-full lg:w-3/5 bg-stone-950 relative flex items-center justify-center min-h-[320px] lg:min-h-[520px] overflow-hidden group">
              {pin.media && pin.media.url ? (
                <>
                  {/* Premium blurred color-matched background ambient glow */}
                  {pin.media.type === "image" ? (
                    <img
                      src={pin.media.url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-25 select-none pointer-events-none scale-105"
                    />
                  ) : (
                    <video
                      src={pin.media.url}
                      className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-25 select-none pointer-events-none scale-105"
                      muted
                      playsInline
                    />
                  )}

                  {/* Sharp sharp-focus foreground media */}
                  {pin.media.type === "image" ? (
                    <img
                      src={pin.media.url}
                      alt={pin.title || "Pin image"}
                      className="relative z-10 max-w-full max-h-[75vh] object-contain cursor-zoom-in transition duration-300 hover:scale-[1.01]"
                      onClick={() => setShowMediaModal(true)}
                    />
                  ) : (
                    <video
                      src={pin.media.url}
                      controls
                      className="relative z-10 max-w-full max-h-[75vh] object-contain cursor-zoom-in"
                      onClick={() => setShowMediaModal(true)}
                    />
                  )}
                </>
              ) : (
                <div className="text-ink-faint flex flex-col items-center py-12">
                  <Image size={64} className="mb-3" />
                  <p>No media available</p>
                </div>
              )}

              <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                  type="button"
                  onClick={likeHandler}
                  className={`w-10 h-10 rounded-full bg-white/95 shadow-card flex items-center justify-center hover:bg-white transition ${
                    liked ? "ring-2 ring-red-200" : ""
                  }`}
                >
                  <Heart size={20} className={liked ? "text-red-500 fill-red-500" : "text-ink-muted"} />
                </button>

                <button
                  type="button"
                  onClick={bookmarkHandler}
                  className={`w-10 h-10 rounded-full bg-white/95 shadow-card flex items-center justify-center hover:bg-white transition ${
                    bookmarked ? "ring-2 ring-ocean-200" : ""
                  }`}
                >
                  <BookmarkPlus size={20} className={bookmarked ? "text-ocean-600" : "text-ink-muted"} />
                </button>

                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-white/95 shadow-card flex items-center justify-center hover:bg-white transition"
                  onClick={(e) => {
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
                  }}
                >
                  <Download size={20} className="text-ink-muted" />
                </button>

                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-white/95 shadow-card flex items-center justify-center hover:bg-white transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (navigator.share) {
                      navigator
                        .share({
                          title: pin.title || "Check out this pin!",
                          text: pin.pin || "Check out this amazing pin!",
                          url: window.location.origin + `/pin/${pin._id}`,
                        })
                        .then(() => console.log("Shared successfully"))
                        .catch((error) =>
                          console.error("Error sharing:", error)
                        );
                    } else {
                      navigator.clipboard
                        .writeText(window.location.origin + `/pin/${pin._id}`)
                        .then(() => alert("Link copied to clipboard!"))
                        .catch((err) => console.error("Clipboard error:", err));
                    }
                  }}
                >
                  <Share2 size={20} className="text-ink-muted" />
                </button>
              </div>
            </div>

            <div className="w-full lg:w-2/5 p-6 flex flex-col border-t lg:border-t-0 lg:border-l border-paper-200">
              <div className="flex items-start justify-between gap-3 mb-4">
                {edit ? (
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Title"
                  />
                ) : (
                  <h1 className="section-title !text-2xl flex-1">{pin.title || "Untitled pin"}</h1>
                )}

                {isOwner && (
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={editHandler} className="btn-ghost !p-2" title={edit ? "Cancel" : "Edit"}>
                      <Edit size={18} />
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(true)} className="btn-ghost !p-2 text-red-600" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-5">
                {edit ? (
                  <textarea
                    value={pinValue}
                    onChange={(e) => setPinValue(e.target.value)}
                    className="input-field min-h-[100px]"
                    rows={4}
                    placeholder="Description"
                  />
                ) : (
                  <p className="text-ink-muted whitespace-pre-line leading-relaxed">
                    {pin.pin || "No description provided."}
                  </p>
                )}

                {edit && (
                  <button type="button" className="btn-primary mt-3" onClick={updateHandler}>
                    Save changes
                  </button>
                )}
              </div>

              {/* AI Alt-Text Accessibility Caption */}
              {pin.altText && (
                <div className="mb-5 p-3.5 rounded-xl bg-paper-100/50 border border-paper-200 text-sm text-ink-muted leading-relaxed">
                  <span className="font-semibold text-ink text-xs block uppercase tracking-wider mb-1">Caption</span>
                  "{pin.altText}"
                </div>
              )}

              {/* AI Generated Tags */}
              {Array.isArray(pin.tags) && pin.tags.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {pin.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => navigate(`/?q=${encodeURIComponent(tag)}`)}
                        className="px-3 py-1 rounded-full bg-paper-100 text-xs font-medium text-ink-muted hover:bg-paper-200 hover:text-ink transition shadow-soft"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted mb-5 py-3 px-4 rounded-xl bg-paper-100">
                {formattedDate && (
                  <>
                    <Clock size={20} className="mr-1" />
                    <span>{formattedDate}</span>
                    <span className="text-ink-faint">·</span>
                  </>
                )}
                <span className="inline-flex items-center gap-1">
                  <MessageSquare size={16} />
                  {pin.comments?.length ?? 0}
                </span>
                <span className="text-ink-faint">·</span>
                <span className="inline-flex items-center gap-1">
                  <Heart size={16} />
                  {pin.likes?.length ?? 0}
                </span>
                <span className="text-ink-faint">·</span>
                <span className="inline-flex items-center gap-1">
                  <Eye size={16} />
                  {viewCount}
                </span>
              </div>

              {pin.owner && (
                <Link to={`/user/${pin.owner._id}`} className="flex items-center gap-3 p-4 rounded-xl bg-paper-100 mb-5 hover:bg-paper-200/80 transition relative overflow-hidden">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0 ${
                    pin.owner.isPremium
                      ? "bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 ring-2 ring-amber-400"
                      : "bg-gradient-to-br from-ocean-400 to-fresh-500"
                  }`}>
                    {pin.owner.name?.slice(0, 1).toUpperCase() || "?"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink flex items-center gap-1.5">
                      {pin.owner.name || "Unknown"}
                      {pin.owner.isPremium && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 shadow-soft">
                          <svg className="w-3 h-3 text-amber-600 shrink-0 fill-amber-600/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          Pro
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-ink-muted">
                      {Array.isArray(pin.owner.followers) ? pin.owner.followers.length : 0} followers
                    </p>
                  </div>
                  <ExternalLink size={16} className="ml-auto text-ink-faint" />
                </Link>
              )}

              {user?._id ? (
                <form className="mb-5" onSubmit={submitHandler}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ocean-400 to-fresh-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {user?.name?.slice(0, 1).toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Add a comment…"
                        className="input-field !rounded-full !pr-12"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <button
                        type="submit"
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${
                          comment.trim() ? "text-ocean-600 hover:bg-ocean-50" : "text-ink-faint cursor-not-allowed"
                        }`}
                        disabled={!comment.trim()}
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="mb-5 p-4 rounded-xl bg-paper-100 border border-paper-200 text-center">
                  <p className="text-sm text-ink-muted mb-2">Want to join the conversation?</p>
                  <Link to="/login" className="btn-primary !py-1.5 !px-4 !text-xs inline-flex items-center gap-1.5">
                    <UserCircle size={14} /> Log in to comment
                  </Link>
                </div>
              )}

              <div className="rounded-xl border border-paper-200 p-4 flex-1 min-h-0">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <h3 className="font-semibold text-ink flex items-center gap-2">
                    <MessageSquare size={18} />
                    Comments ({pin.comments?.length ?? 0})
                  </h3>
                  <label className="text-sm text-ink-muted flex items-center gap-2">
                    Sort
                    <select
                      value={commentSorting}
                      onChange={(e) => setCommentSorting(e.target.value)}
                      className="input-field !py-1 !px-2 text-sm !w-auto"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                    </select>
                  </label>
                </div>

                <div className="overflow-y-auto max-h-72 space-y-3">
                  {pin.comments?.length > 0 ? (
                    sortComments(pin.comments).map((c, i) => (
                      <div key={c._id || i} className="flex gap-3 group p-3 rounded-xl bg-paper-50">
                        <Link to={`/user/${c.user}`} className="shrink-0">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ocean-300 to-fresh-400 flex items-center justify-center text-white text-xs font-bold">
                            {c.name?.slice(0, 1).toUpperCase() || "?"}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-ink text-sm">{c.name || "Anonymous"}</h4>
                            {c.user === user?._id && (
                              <button
                                type="button"
                                onClick={() => deleteCommentHandler(c._id)}
                                className="ml-auto opacity-0 group-hover:opacity-100 text-ink-faint hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <p className="text-ink-muted text-sm mt-0.5">{c.comment}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center text-ink-muted">
                      <MessageSquare size={32} className="mx-auto mb-2 text-ink-faint" />
                      <p className="font-medium text-ink">No comments yet</p>
                      <p className="text-sm mt-1">Be the first to share your thoughts.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* More Like This (Visually Similar KNN Recommendations) */}
        <div className="mt-12">
          <h2 className="section-title !text-xl mb-6">More Like This (Visually Similar)</h2>
          {relatedPins.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {relatedPins.map((rPin) => (
                <PinCard key={rPin._id} pin={rPin} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-ink-muted bg-paper-100 rounded-2xl border border-dashed border-paper-300">
              <p className="font-medium text-ink">No visual recommendations available</p>
              <p className="text-sm mt-1 text-ink-faint">Try creating more pins or wait for Gemini to finish analyzing media.</p>
            </div>
          )}
        </div>
      </div>

      {showMediaModal && pin.media?.url && (
        <div className="fixed inset-0 bg-ink/80 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setShowMediaModal(false)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-lg text-ink hover:bg-paper-100"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          {pin.media.type === "image" ? (
            <img
              src={pin.media.url}
              alt={pin.title || "Pin image"}
              className="max-w-full max-h-[90vh] object-contain"
            />
          ) : (
            <video
              src={pin.media.url}
              controls
              autoPlay
              className="max-w-full max-h-[90vh] object-contain"
            />
          )}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-md">
            <h3 className="text-xl font-display font-semibold text-ink mb-2">Delete pin?</h3>
            <p className="text-ink-muted mb-6">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmDelete(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={deletePinHandler} className="btn-primary !bg-red-600 hover:!bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PinPage;