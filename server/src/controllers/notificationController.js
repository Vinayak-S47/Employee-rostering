// src/controllers/notificationController.js
const Notification = require('../models/Notification');
const { sendSuccess, sendNotFound, sendPaginated } = require('../utils/apiResponse');
const { paginate, buildPaginationMeta } = require('../utils/pagination');

const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const { skip, limit: lim, page: pg } = paginate(page, limit);
    const filter = { recipient: req.user._id };
    if (unreadOnly === 'true') filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    return sendPaginated(res, notifications, buildPaginationMeta(total, pg, lim), 'Notifications fetched');
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });
    if (!notif) return sendNotFound(res, 'Notification');
    notif.isRead = true;
    notif.readAt = new Date();
    await notif.save();
    return sendSuccess(res, notif, 'Marked as read');
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
