const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const Version = require('../models/Version');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const canAccess = (doc, userId, permission = 'view') => {
  if (doc.owner.toString() === userId.toString()) return true;
  const collab = doc.collaborators.find(c => c.user.toString() === userId.toString());
  if (!collab) return false;
  if (permission === 'view') return true;
  return collab.permission === 'edit';
};

// GET /api/documents
router.get('/', protect, async (req, res) => {
  try {
    const owned = await Document.find({ owner: req.user._id })
      .select('title updatedAt wordCount owner lastEditedBy')
      .populate('lastEditedBy', 'name color')
      .sort({ updatedAt: -1 });

    const shared = await Document.find({ 'collaborators.user': req.user._id })
      .select('title updatedAt wordCount owner lastEditedBy')
      .populate('owner', 'name color')
      .populate('lastEditedBy', 'name color')
      .sort({ updatedAt: -1 });

    res.json({ owned, shared });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/documents
router.post('/', protect, async (req, res) => {
  try {
    const doc = await Document.create({
      title: req.body.title || 'Untitled Document',
      owner: req.user._id,
      lastEditedBy: req.user._id,
    });
    await Version.create({
      document: doc._id, content: doc.content,
      savedBy: req.user._id, label: 'Initial draft', versionNumber: 1,
    });
    res.status(201).json(doc);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/documents/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('owner', 'name email color')
      .populate('collaborators.user', 'name email color')
      .populate('lastEditedBy', 'name color');
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (!canAccess(doc, req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    res.json(doc);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/documents/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (!canAccess(doc, req.user._id, 'edit'))
      return res.status(403).json({ message: 'Access denied' });
    if (req.body.title !== undefined) doc.title = req.body.title;
    doc.lastEditedBy = req.user._id;
    await doc.save();
    res.json({ _id: doc._id, title: doc.title, updatedAt: doc.updatedAt });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the owner can delete this document' });
    await Document.deleteOne({ _id: doc._id });
    await Version.deleteMany({ document: doc._id });
    res.json({ message: 'Document deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/documents/:id/versions
router.get('/:id/versions', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (!canAccess(doc, req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    const versions = await Version.find({ document: req.params.id })
      .populate('savedBy', 'name color')
      .sort({ versionNumber: -1 })
      .limit(50);
    res.json(versions);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/documents/:id/versions/restore/:versionId
router.post('/:id/versions/restore/:versionId', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (!canAccess(doc, req.user._id, 'edit'))
      return res.status(403).json({ message: 'Access denied' });
    const version = await Version.findById(req.params.versionId);
    if (!version) return res.status(404).json({ message: 'Version not found' });

    const latest = await Version.findOne({ document: doc._id }).sort({ versionNumber: -1 });
    await Version.create({
      document: doc._id, content: doc.content, contentText: doc.contentText,
      savedBy: req.user._id, label: `Before restore to v${version.versionNumber}`,
      wordCount: doc.wordCount, versionNumber: (latest?.versionNumber || 0) + 1,
    });

    doc.content = version.content;
    doc.contentText = version.contentText;
    doc.wordCount = version.wordCount;
    doc.lastEditedBy = req.user._id;
    await doc.save();
    res.json({ message: 'Document restored', content: doc.content });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/documents/:id/share
router.post('/:id/share', protect, async (req, res) => {
  try {
    const { permission } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the owner can manage sharing' });

    if (permission === 'none') {
      doc.shareLink = undefined;
      doc.shareLinkPermission = 'none';
    } else {
      if (!doc.shareLink) doc.shareLink = uuidv4();
      doc.shareLinkPermission = permission || 'view';
    }
    await doc.save();
    res.json({ shareLink: doc.shareLink, shareLinkPermission: doc.shareLinkPermission });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/documents/:id/collaborators
router.post('/:id/collaborators', protect, async (req, res) => {
  try {
    const { email, permission } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the owner can add collaborators' });

    const invitee = await User.findOne({ email });
    if (!invitee) return res.status(404).json({ message: 'No user found with that email' });
    if (invitee._id.toString() === req.user._id.toString())
      return res.status(400).json({ message: 'You are already the owner' });

    const existing = doc.collaborators.find(c => c.user.toString() === invitee._id.toString());
    if (existing) {
      existing.permission = permission || 'edit';
    } else {
      doc.collaborators.push({ user: invitee._id, permission: permission || 'edit' });
    }
    await doc.save();
    await doc.populate('collaborators.user', 'name email color');
    res.json(doc.collaborators);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;