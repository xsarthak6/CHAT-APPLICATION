const Document = require('../models/Document');
const Version = require('../models/Version');
const { verifySocketToken } = require('../middleware/auth');

const activeRooms = {};
const saveTimers = {};

const registerSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    const user = await verifySocketToken(token);
    if (!user) return next(new Error('Invalid token'));
    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`Connected: ${socket.user.name} (${socket.id})`);

    socket.on('join-document', async ({ documentId }) => {
      try {
        const doc = await Document.findById(documentId)
          .populate('owner', 'name email color')
          .populate('collaborators.user', 'name email color')
          .populate('lastEditedBy', 'name color');

        if (!doc) { socket.emit('error', { message: 'Document not found' }); return; }

        const userId = socket.user._id.toString();
        const isOwner = doc.owner._id.toString() === userId;
        const isCollab = doc.collaborators.some(c => c.user._id.toString() === userId);
        if (!isOwner && !isCollab && !doc.isPublic) {
          socket.emit('error', { message: 'Access denied' }); return;
        }

        socket.join(documentId);
        socket.currentDocId = documentId;

        if (!activeRooms[documentId]) activeRooms[documentId] = {};
        activeRooms[documentId][userId] = {
          socketId: socket.id,
          user: { _id: socket.user._id, name: socket.user.name, color: socket.user.color },
          cursor: null,
        };

        socket.emit('load-document', {
          _id: doc._id, title: doc.title, content: doc.content,
          owner: doc.owner, collaborators: doc.collaborators, updatedAt: doc.updatedAt,
        });

        const roomUsers = Object.values(activeRooms[documentId]).map(u => u.user);
        io.to(documentId).emit('active-users', roomUsers);
      } catch (err) {
        console.error('join-document error:', err);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    socket.on('send-changes', ({ documentId, delta, source }) => {
      if (source !== 'user') return;
      socket.to(documentId).emit('receive-changes', { delta, userId: socket.user._id });
    });

    socket.on('save-document', async ({ documentId, content, contentText }) => {
      try {
        const doc = await Document.findById(documentId);
        if (!doc) return;

        const wordCount = contentText
          ? contentText.trim().split(/\s+/).filter(w => w.length > 0).length
          : 0;

        doc.content = content;
        doc.contentText = contentText || '';
        doc.wordCount = wordCount;
        doc.lastEditedBy = socket.user._id;
        await doc.save();

        const latest = await Version.findOne({ document: documentId }).sort({ versionNumber: -1 });
        const nextNum = (latest?.versionNumber || 0) + 1;

        await Version.create({
          document: documentId, content, contentText: contentText || '',
          savedBy: socket.user._id, wordCount,
          versionNumber: nextNum, label: `Auto-save by ${socket.user.name}`,
        });

        // Prune to last 50 versions
        const all = await Version.find({ document: documentId })
          .sort({ versionNumber: -1 }).select('_id');
        if (all.length > 50) {
          const toDelete = all.slice(50).map(v => v._id);
          await Version.deleteMany({ _id: { $in: toDelete } });
        }

        io.to(documentId).emit('document-saved', {
          updatedAt: doc.updatedAt,
          savedBy: { name: socket.user.name, color: socket.user.color },
          wordCount,
        });
      } catch (err) {
        console.error('save-document error:', err);
      }
    });

    socket.on('title-change', ({ documentId, title }) => {
      socket.to(documentId).emit('title-changed', { title, userId: socket.user._id });
      Document.findByIdAndUpdate(documentId, {
        title, lastEditedBy: socket.user._id,
      }).catch(console.error);
    });

    socket.on('cursor-change', ({ documentId, range }) => {
      if (activeRooms[documentId]?.[socket.user._id]) {
        activeRooms[documentId][socket.user._id].cursor = range;
      }
      socket.to(documentId).emit('cursor-update', {
        userId: socket.user._id,
        user: { name: socket.user.name, color: socket.user.color },
        range,
      });
    });

    socket.on('typing', ({ documentId, isTyping }) => {
      socket.to(documentId).emit('user-typing', {
        userId: socket.user._id,
        name: socket.user.name,
        color: socket.user.color,
        isTyping,
      });
    });

    socket.on('disconnect', () => {
      const docId = socket.currentDocId;
      if (docId && activeRooms[docId]) {
        delete activeRooms[docId][socket.user._id.toString()];
        if (Object.keys(activeRooms[docId]).length === 0) {
          delete activeRooms[docId];
        } else {
          const roomUsers = Object.values(activeRooms[docId]).map(u => u.user);
          io.to(docId).emit('active-users', roomUsers);
        }
        socket.to(docId).emit('user-left', {
          userId: socket.user._id, name: socket.user.name,
        });
      }
    });
  });
};

module.exports = registerSocketHandlers;