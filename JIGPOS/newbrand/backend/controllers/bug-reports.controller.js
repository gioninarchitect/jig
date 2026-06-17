// Bug Reports Controller — All handler logic for bug report endpoints
const Bug = require('../modules/database/models/Bug');
const logger = require('../modules/logger');

// POST / — Create new bug report (public UAT endpoint)
const create = async (req, res) => {
  try {
    const bugData = req.body;

    // Validate required fields
    if (!bugData.type || !bugData.priority || !bugData.description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, priority, description'
      });
    }

    // Create bug
    const bug = new Bug(bugData);
    await bug.save();

    logger.info(`Bug report created: ${bug.id} - ${bug.description.substring(0, 50)}...`);

    res.status(201).json({
      success: true,
      message: 'Bug report submitted successfully',
      bug: {
        id: bug.id,
        type: bug.type,
        priority: bug.priority,
        status: bug.status
      }
    });
  } catch (error) {
    logger.error('Error creating bug report:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting bug report',
      error: error.message
    });
  }
};

// GET / — List bugs with optional status/priority/type filters
const getAll = async (req, res) => {
  try {
    const { status, priority, type, limit = 100 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (type) query.type = type;

    const bugs = await Bug.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      bugs,
      total: bugs.length
    });
  } catch (error) {
    logger.error('Error fetching bug reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bug reports',
      error: error.message
    });
  }
};

// GET /:bugId — Single bug by numeric id field
const getById = async (req, res) => {
  try {
    const { bugId } = req.params;

    const bug = await Bug.findOne({ id: parseInt(bugId) });

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug report not found'
      });
    }

    res.json({
      success: true,
      bug
    });
  } catch (error) {
    logger.error('Error fetching bug report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bug report',
      error: error.message
    });
  }
};

// PUT /:bugId — Update bug status
const update = async (req, res) => {
  try {
    const { bugId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const bug = await Bug.findOneAndUpdate(
      { id: parseInt(bugId) },
      { status },
      { new: true }
    );

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug report not found'
      });
    }

    logger.info(`Bug report ${bugId} status updated to: ${status}`);

    res.json({
      success: true,
      message: 'Bug status updated successfully',
      bug
    });
  } catch (error) {
    logger.error('Error updating bug report:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating bug report',
      error: error.message
    });
  }
};

// DELETE /:bugId — Delete bug report
const remove = async (req, res) => {
  try {
    const { bugId } = req.params;

    const bug = await Bug.findOneAndDelete({ id: parseInt(bugId) });

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug report not found'
      });
    }

    logger.info(`Bug report deleted: ${bugId}`);

    res.json({
      success: true,
      message: 'Bug report deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting bug report:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting bug report',
      error: error.message
    });
  }
};

// GET /stats/summary — Bug statistics by status and priority
const getStats = async (req, res) => {
  try {
    const total = await Bug.countDocuments();
    const newBugs = await Bug.countDocuments({ status: 'new' });
    const inProgress = await Bug.countDocuments({ status: 'in_progress' });
    const review = await Bug.countDocuments({ status: 'review' });
    const resolved = await Bug.countDocuments({ status: 'resolved' });

    const critical = await Bug.countDocuments({ priority: 'critical' });
    const high = await Bug.countDocuments({ priority: 'high' });
    const medium = await Bug.countDocuments({ priority: 'medium' });
    const low = await Bug.countDocuments({ priority: 'low' });

    res.json({
      success: true,
      stats: {
        total,
        byStatus: {
          new: newBugs,
          in_progress: inProgress,
          review,
          resolved
        },
        byPriority: {
          critical,
          high,
          medium,
          low
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching bug statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bug statistics',
      error: error.message
    });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
  getStats
};
