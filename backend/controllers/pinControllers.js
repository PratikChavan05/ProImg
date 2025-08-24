import { Pin } from "../models/pinModel.js";
import TryCatch from "../utils/TryCatch.js";
import getDataUrl from "../utils/urlGenerator.js";
import cloudinary from "cloudinary";

export const createPin = TryCatch(async (req, res) => {
  const { title, pin } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      message: "Media file is required.",
    });
  }

  const fileUrl = getDataUrl(file);
  let cloud;
  let resourceType;

  if (file.mimetype.startsWith("image")) {
    cloud = await cloudinary.v2.uploader.upload(fileUrl.content);
    resourceType = "image";
  } else if (file.mimetype.startsWith("video")) {
    cloud = await cloudinary.v2.uploader.upload(fileUrl.content, {
      resource_type: "video",
    });
    resourceType = "video";
  } else {
    return res.status(400).json({
      message: "Unsupported file type. Please upload an image or video.",
    });
  }

  await Pin.create({
    title,
    pin,
    media: {
      id: cloud.public_id,
      url: cloud.secure_url,
      type: resourceType,
    },
    owner: req.user._id,
  });

  res.status(200).json({
    message: "Pin created",
  });
});

export const deletePin = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id);

  if (!pin)
    return res.status(400).json({
      message: "No Pin with this id",
    });

  if (pin.owner.toString() !== req.user._id.toString())
    return res.status(403).json({
      message: "Unauthorized",
    });

  // Now accessing the media object
  await cloudinary.v2.uploader.destroy(pin.media.id, {
    resource_type: pin.media.type,
  });

  await pin.deleteOne();

  res.json({
    message: "Pin Deleted",
  });
});

// Other controller functions remain the same
export const getAllPins = TryCatch(async (req, res) => {
  const pins = await Pin.find().sort({ createdAt: -1 });
  res.json(pins);
});

export const getSinglePin = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id).populate("owner", "-password");
  res.json(pin);
});

export const commentOnPin = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id);
  if (!pin)
    return res.status(400).json({
      message: "no pin with this ID",
    });

  pin.comments.push({
    user: req.user._id,
    name: req.user.name,
    comment: req.body.comment,
  });

  await pin.save();
  res.json({
    message: "Comment added",
  });
});

export const deleteComment = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id);

  if (!pin)
    return res.status(400).json({
      message: "No Pin with this id",
    });

  if (!req.query.commentId)
    return res.status(404).json({
      message: "Please give comment id",
    });

  const commentIndex = pin.comments.findIndex(
    (item) => item._id.toString() === req.query.commentId.toString()
  );

  if (commentIndex === -1) {
    return res.status(404).json({
      message: "Comment not found",
    });
  }

  const comment = pin.comments[commentIndex];

  if (comment.user.toString() === req.user._id.toString()) {
    pin.comments.splice(commentIndex, 1);

    await pin.save();

    return res.json({
      message: "Comment Deleted",
    });
  } else {
    return res.status(403).json({
      message: "You are not owner of this comment",
    });
  }
});

export const updatePin = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id);

  if (!pin)
    return res.status(400).json({
      message: "No Pin with this id",
    });

  if (pin.owner.toString() !== req.user._id.toString())
    return res.status(403).json({
      message: "Unauthorized",
    });

  pin.title = req.body.title;
  pin.pin = req.body.pin;

  await pin.save();

  res.json({
    message: "Pin updated",
  });
});

export const likeAndUnlike = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id);
  const loggedInUser = req.user._id;

  if (!pin) {
    return res.status(400).json({ message: "No pin with this id" });
  }

  const isLiked = pin.likes.includes(loggedInUser);

  if (isLiked) {
    pin.likes = pin.likes.filter(
      (id) => id.toString() !== loggedInUser.toString()
    );
    await pin.save();
    return res.json({ message: "Disliked" });
  } else {
    pin.likes.push(loggedInUser);
    await pin.save();
    return res.json({ message: "Pin liked" });
  }
});

export const countViews = TryCatch(async (req, res) => {
  const { pinId, userId } = req.body;

  const pin = await Pin.findById(pinId);
  if (!pin)
    return res.status(400).json({
      message: "No pin with this id",
    });
  const isViewed = pin.views.includes(userId);
  if (isViewed)
    return res.status(400).json({
      message: "Already viewed",
    });
  pin.views.push(userId);
  await pin.save();
  res.json({
    message: "Pin viewed",
  });
});

export const getViews = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id).populate("views", "name");

  if (!pin) {
    return res.status(400).json({ message: "No pin with this id" });
  }

  res.json(pin.views);
});

export const getLikes = TryCatch(async (req, res) => {
  const pin = await Pin.findById(req.params.id).populate("likes", "name");

  if (!pin) {
    return res.status(400).json({ message: "No pin with this id" });
  }

  res.json(pin.likes);
});

export const myLikes = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required." });
    }

    const pins = await Pin.find({ likes: id });

    res.status(200).json({
      success: true,
      pins,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};