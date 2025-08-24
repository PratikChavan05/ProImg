import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PinData } from "../context/PinContext";
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

  if (!user || !user._id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-gray-900 text-white">
        <AlertCircle size={32} className="mb-4 text-yellow-500" />
        <p className="text-gray-300 font-medium text-xl">
          Please log in to view pin details
        </p>
        <button
          onClick={() => navigate("/login")}
          className="mt-6 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors duration-300 flex items-center"
        >
          <UserCircle className="mr-2" size={20} />
          Go to Login
        </button>
      </div>
    );
  }

  useEffect(() => {
    if (pin && Array.isArray(pin.likes)) {
      setLiked(pin.likes.includes(user._id));
    }
  }, [pin, user._id]);

  useEffect(() => {
    if (params.id) {
      setError(null);
      fetchPin(params.id).catch((err) =>
        setError(err?.message || "Failed to load pin details")
      );
    }
  }, [params.id]);

  useEffect(() => {
    if (pin) {
      setTitle(pin.title || "");
      setPinValue(pin.pin || "");

      const mockRelatedPins = [
        {
          _id: "related1",
          title: "Similar Design Inspiration",
          media: {
            url: "https://via.placeholder.com/300",
            type: "image",
          },
          likes: ["user1", "user2"],
          owner: { name: "Designer Pro" },
        },
        {
          _id: "related2",
          title: "Related Creative Work",
          media: {
            url: "https://via.placeholder.com/300/500/0000FF",
            type: "image",
          },
          likes: ["user1"],
          owner: { name: "Creative Mind" },
        },
        {
          _id: "related3",
          title: "More Like This",
          media: {
            url: "https://via.placeholder.com/300/FF0000/FFFFFF",
            type: "image",
          },
          likes: ["user3", "user4", "user5"],
          owner: { name: "Inspiration Hub" },
        },
      ];

      setRelatedPins(mockRelatedPins);
    }
  }, [pin]);

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
    try {
      likePin(pin._id);
      setLiked(!liked);
    } catch (err) {
      setError(err?.message || "Failed to like pin");
    }
  };

  const bookmarkHandler = () => {
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
    <div className="flex flex-col items-center justify-center min-h-[50vh] bg-gray-900">
      <div className="w-16 h-16 border-4 border-gray-700 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
      <p className="text-gray-300 font-medium text-lg">
        Loading pin details...
      </p>
    </div>
  );

  const ErrorDisplay = () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] bg-gray-900">
      <AlertCircle size={40} className="mb-6 text-red-500" />
      <p className="text-red-400 font-medium text-lg mb-2">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-6 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-white transition-colors"
      >
        Try Again
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-gray-900">
        <AlertCircle size={40} className="mb-6 text-yellow-500" />
        <p className="text-gray-300 font-medium text-xl mb-2">
          Pin not found or was deleted
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Go Home
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

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-300 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft size={20} className="mr-1" />
          <span>Back</span>
        </button>

        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700">
          <div className="flex flex-col lg:flex-row">
            {/* Left side - Media */}
            <div className="w-full lg:w-3/5 bg-gray-900 relative flex items-center justify-center min-h-[400px]">
              {pin.media && pin.media.url ? (
                <>
                  {pin.media.type === "image" ? (
                    <img
                      src={pin.media.url}
                      alt={pin.title || "Pin image"}
                      className="w-full h-full object-contain lg:max-h-[80vh] cursor-zoom-in"
                      onClick={() => setShowMediaModal(true)}
                    />
                  ) : (
                    <video
                      src={pin.media.url}
                      controls
                      className="w-full h-full object-contain lg:max-h-[80vh] cursor-zoom-in"
                      onClick={() => setShowMediaModal(true)}
                    />
                  )}
                </>
              ) : (
                <div className="text-gray-400 flex flex-col items-center">
                  <Image size={64} className="mb-3" />
                  <p>No media available</p>
                </div>
              )}

              {/* Media actions overlay */}
              <div className="absolute bottom-4 right-4 flex space-x-3">
                <button
                  onClick={likeHandler}
                  className={`w-10 h-10 rounded-full bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors ${
                    liked ? "bg-red-900" : ""
                  }`}
                >
                  <Heart
                    size={20}
                    className={
                      liked ? "text-red-500 fill-red-500" : "text-gray-300"
                    }
                  />
                </button>

                <button
                  onClick={bookmarkHandler}
                  className={`w-10 h-10 rounded-full bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors ${
                    bookmarked ? "bg-emerald-900" : ""
                  }`}
                >
                  <BookmarkPlus
                    size={20}
                    className={
                      bookmarked ? "text-emerald-500" : "text-gray-300"
                    }
                  />
                </button>

                <button
                  className="w-10 h-10 rounded-full bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
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
                  <Download size={20} className="text-gray-300" />
                </button>

                <button
                  className="w-10 h-10 rounded-full bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
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
                  <Share2 size={20} className="text-gray-300" />
                </button>
              </div>
            </div>

            {/* Right side - Content */}
            <div className="w-full lg:w-3/5 p-6 flex flex-col bg-gray-800">
              <div className="flex items-center justify-between mb-6">
                {edit ? (
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-white"
                    placeholder="Enter Title"
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-white">
                    {pin.title || "Untitled Pin"}
                  </h1>
                )}

                {isOwner && (
                  <div className="flex space-x-3 ml-4">
                    <button
                      onClick={editHandler}
                      className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-emerald-400 transition-colors bg-gray-700 hover:bg-gray-600 rounded-full"
                      title={edit ? "Cancel editing" : "Edit pin"}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors bg-gray-700 hover:bg-gray-600 rounded-full"
                      title="Delete pin"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-6">
                {edit ? (
                  <textarea
                    value={pinValue}
                    onChange={(e) => setPinValue(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-white"
                    rows="4"
                    placeholder="Enter Description"
                  />
                ) : (
                  <p className="text-gray-300 whitespace-pre-line text-lg">
                    {pin.pin || "No description provided."}
                  </p>
                )}

                {edit && (
                  <button
                    className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow transition"
                    onClick={updateHandler}
                  >
                    Update Pin
                  </button>
                )}
              </div>

              <div className="flex items-center text-gray-400 text-sm mb-6 bg-gray-700 py-3 px-4 rounded-lg">
                {formattedDate && (
                  <>
                    <Clock size={20} className="mr-1" />
                    <span>{formattedDate}</span>
                    <div className="mx-3 h-1 w-1 rounded-full bg-gray-500"></div>
                  </>
                )}
                <MessageSquare size={20} className="mr-1" />
                <span>
                  {pin.comments && Array.isArray(pin.comments)
                    ? pin.comments.length
                    : 0}{" "}
                </span>

                <div className="mx-3 h-1 w-1 rounded-full bg-gray-500"></div>

                <Heart size={20} className="mr-1" />
                <span>
                  {pin.likes && Array.isArray(pin.likes) ? pin.likes.length : 0}{" "}
                </span>

                <div className="flex-grow"></div>

                <Eye size={20} className=" ml-1 mr-1" />
                <span>{Math.floor(Math.random() * 1000) + 100} </span>
              </div>

              {pin.owner && (
                <div className="flex items-center bg-gray-700 p-4 rounded-lg my-6">
                  <Link
                    to={`/user/${pin.owner._id}`}
                    className="flex items-center flex-1"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold">
                      {pin.owner.name
                        ? pin.owner.name.slice(0, 1).toUpperCase()
                        : "?"}
                    </div>
                    <div className="ml-3">
                      <h3 className="font-medium text-white">
                        {pin.owner.name || "Unknown User"}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {pin.owner.followers &&
                        Array.isArray(pin.owner.followers)
                          ? `${pin.owner.followers.length} followers`
                          : "0 followers"}
                      </p>
                    </div>
                  </Link>
                </div>
              )}

              <form className="mb-6" onSubmit={submitHandler}>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold mr-3">
                    {user?.name ? user.name.slice(0, 1).toUpperCase() : "U"}
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      className="w-full px-4 py-2 pr-12 rounded-full bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-white"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <button
                      type="submit"
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center ${
                        comment.trim()
                          ? "text-emerald-400 hover:text-emerald-300"
                          : "text-gray-500 cursor-not-allowed"
                      }`}
                      disabled={!comment.trim()}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </form>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-white flex items-center">
                    <MessageSquare size={18} className="mr-2" />
                    Comments (
                    {pin.comments && Array.isArray(pin.comments)
                      ? pin.comments.length
                      : 0}
                    )
                  </h3>

                  <div className="flex items-center">
                    <span className="text-sm text-gray-400 mr-2">Sort by:</span>
                    <select
                      value={commentSorting}
                      onChange={(e) => setCommentSorting(e.target.value)}
                      className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-sm"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-80 pr-2 space-y-4">
                  {pin.comments &&
                  Array.isArray(pin.comments) &&
                  pin.comments.length > 0 ? (
                    sortComments(pin.comments).map((comment, i) => (
                      <div
                        key={i}
                        className="flex group bg-gray-800 p-3 rounded-lg"
                      >
                        <Link
                          to={`/user/${comment.user}`}
                          className="flex-shrink-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {comment.name && typeof comment.name === "string"
                              ? comment.name.slice(0, 1).toUpperCase()
                              : "?"}
                          </div>
                        </Link>
                        <div className="ml-3 flex-1">
                          <div className="flex items-center">
                            <h4 className="font-medium text-white">
                              {comment.name || "Anonymous"}
                            </h4>
                            {comment.user === user._id && (
                              <button
                                onClick={() =>
                                  deleteCommentHandler(comment._id)
                                }
                                className="ml-auto opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition"
                                title="Delete comment"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <p className="text-gray-300 text-sm mt-1">
                            {comment.comment}
                          </p>
                          <div className="flex items-center mt-2 text-gray-500 text-xs">
                            <button className="flex items-center mr-4 hover:text-gray-300">
                              <ThumbsUp size={12} className="mr-1" />
                              <span>Like</span>
                            </button>
                            <span>Just now</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                      <MessageSquare size={32} className="mb-2 text-gray-500" />
                      <p>No comments yet</p>
                      <p className="text-sm mt-1">
                        Be the first one to share your thoughts!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showMediaModal && pin.media && pin.media.url && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowMediaModal(false)}
              className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-full hover:bg-gray-700 text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Delete Pin</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this pin? This action cannot be
              undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deletePinHandler}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
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