/*global Drafts */

(function(exports) {
  'use strict';

  var threads = new Map();
  var rthread = /\bthread=(.+)$/;
  var currentId, lastId;

  function idFromHash(hash) {
    var matches = rthread.exec(hash);
    return (matches && matches.length) ? (matches[1].trim()) : false;
  }

  // Disambiguate between numeric ids which may have been coerced to string
  // and character ids which cannot be coerced to a number
  // to Number coercions will result in NaN for character strings
  function isNumericId(id) {
    return !Number.isNaN(+id);
  }

  function Thread(thread) {
    var length = Thread.FIELDS.length;
    var key;

    for (var i = 0; i < length; i++) {
      key = Thread.FIELDS[i];
      this[key] = thread[key];
    }

    this.messages = [];
  }

  Thread.FIELDS = [
    'body', 'id', 'lastMessageSubject', 'lastMessageType',
    'participants', 'timestamp', 'unreadCount'
  ];

  Thread.fromMessage = function(record, options) {
    var participants = [];

    if (typeof record.delivery !== 'undefined') {
      if (record.delivery === 'received' ||
          record.delivery === 'not-downloaded') {
        participants = [record.sender];
      } else {
        participants = record.receivers || [record.receiver];
      }
    }

    return new Thread({
      id: record.id,
      participants: participants,
      body: record.body,
      timestamp: record.timestamp,
      unreadCount: (options && !options.read) ? 1 : 0,
      lastMessageType: record.type || 'sms'
    });
  };

  Thread.fromDraft = function(record, options) {

    var body = record.content && record.content.length ?
      record.content.find(function(content) {
        if (typeof content === 'string') {
          return true;
        }
      }) : '';

    return new Thread({
      id: record.id,
      participants: record.recipients || [''],
      body: body,
      timestamp: new Date(record.timestamp),
      unreadCount: (options && !options.read) ? 1 : 0,
      lastMessageType: record.type || 'sms'
    });
  };

  Thread.create = function(record, options) {
    if (record instanceof Thread) {
      return record;
    }
    return record.delivery ?
      Thread.fromMessage(record, options) :
      Thread.fromDraft(record, options);
  };

  Thread.prototype = {
    constructor: Thread,
    get hasDraft() {
      return !!Drafts.has(this.id);
    }
  };

  var Threads = exports.Threads = {
    registerMessage: function(message) {
      var thread = Thread.create(message);
      var threadId = message.threadId;
      if (!this.has(threadId)) {
        this.set(threadId, thread);
      }
      this.get(threadId).messages.push(message);
    },
    set: function(id, thread) {
      var old;
      id = +id;
      if (threads.has(id)) {
        // Updates the reference
        old = threads.get(id);
        for (var p in thread) {
          old[p] = thread[p];
        }
        return threads;
      }
      return threads.set(id, new Thread(thread));
    },
    get: function(id) {
      return isNumericId(id) ?
        threads.get(+id) : Thread.fromDraft(Drafts.get(id));
    },
    has: function(id) {
      return isNumericId(id) ? threads.has(+id) : Drafts.has(id);
    },
    delete: function(id) {
      // Drafts for numeric and non-numeric ids are deleted
      if (Drafts.has(id)) {
        Drafts.delete(id);
      }
      return threads.delete(+id);
    },
    clear: function() {
      threads = new Map();
    },
    forEach: function(callback) {
      threads.forEach(function(v, k) {
        callback(v, k);
      });
    },
    idFromHash: function(hash) {
      return idFromHash(hash);
    },
    hasDraft: function(id) {
      return isNumericId(id) && Drafts.has(id);
    },
    isDraftId: function(id) {
      return !isNumericId(id);
    },
    get size() {
      // support: gecko 18 - size might be a function
      if (typeof threads.size === 'function') {
        return +threads.size();
      }
      return +threads.size;
    },
    get currentId() {
      var current = idFromHash(window.location.hash);
      if (!current && current !== lastId) {
        lastId = current;
      }

      return current;
    },
    get lastId() {
      return lastId || currentId;
    },
    get active() {
      return threads.get(Threads.currentId);
    }
  };

  exports.Thread = Thread;

  window.addEventListener('hashchange', currentId);
}(this));
