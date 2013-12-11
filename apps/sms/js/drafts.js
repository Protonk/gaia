/*global asyncStorage */
(function(exports) {
  'use strict';
  var draftIndex = new Map();
  var isCached = false;

  /**
   * guid
   *
   * Generate a id for drafts which are not associated with
   * existing threads
   *
   * @return {String} A relatively unique string id
   */
  function guid() {
    // Prepend 'd' to ensure this won't coerce to a number
    var id = 'd';
    // Only need to grab 'entropy' from the last part of the date
    id += Date.now().toString(36).substr(-3);
    // To avoid the possible case where two guid calls in the same
    // millisecond cause a collision we pad with some random characters
    return id += (1 + Math.random()).toString(36).substring(2, 10);
  }

  /**
   * Drafts
   *
   * A collection of active Draft objects, indexed by thread id.
   */
  var Drafts = {
    /**
     * add
     *
     * Push a Draft object or an object that has
     * all the properties of a Draft instance
     * to the Drafts collection. If the object
     * isn't an instance of Draft, initialize
     * a new Draft.
     *
     * @param  {Object}  draft  Draft-like object.
     *
     * @return {Drafts} return the Drafts object.
     */
    add: function(draft) {
      if (draft) {
        if (!(draft instanceof Draft)) {
          draft = new Draft(draft);
        }
        draftIndex.set(draft.id, draft);
      }
      return this;
    },
    /**
     * delete
     *
     * Delete a draft record from the collection.
     *
     * @param  {[Draft|(Number|String)]} draft draft to delete, optionally just
     *                                   the id.
     *
     * @return {Drafts} return the Drafts object.
     */
    delete: function(draft) {
      draftIndex.delete(draft && (draft.id || draft));
      return this;
    },
    /**
     * get
     *
     * Returns all the drafts for the specified thread id.
     *
     * @param  {[(Number|String)]}  id id of the drafts to return.
     *
     * @return {Draft|Boolean}  return Draft object of thread or false if
     *                          no Draft exists.
     */
    get: function(id) {
      var recalled = draftIndex.get(id);
      return recalled ? new Draft(recalled) : false;
    },
    /**
     * has
     *
     * Returns all the drafts for the specified thread id.
     *
     * @param  {[(Number|String)]}  id id of the drafts to return.
     *
     * @return {Boolean} return true if a draft exists in the index
     */
    has: function(id) {
      return draftIndex.has(id);
    },
    /**
     * clear
     *
     * Delete drafts from the map.
     *
     * @return {Drafts} return the Drafts object.
     */
    clear: function() {
      draftIndex = new Map();
      return this;
    },
    /**
     * threadless
     *
     * Get ids for drafts not associated with sent message threads
     *
     * @return {Array} return an array of ids
     */
    threadless: function() {
      var keys = [];
      for (var [key, value] of draftIndex) {
        if (Number.isNaN(+key) && value) {
          keys.push(key);
        }
      }
      return keys;
    },
    forEach: function(callback) {
      draftIndex.forEach(function(v, k) {
        callback(v, k);
      });
    },
    /**
     * store
     *
     * Store draftIndex held in memory to local storage
     *
     * @return {Undefined} void return.
     */
    store: function() {
      // Once ES6 syntax is allowed,
      // replace the forEach operations below with the following line:
      // asyncStorage.setItem('draft index', [...draftIndex]);
      var entries = [];
      draftIndex.forEach(function(v, k) {
        entries.push([k, v]);
      });
      asyncStorage.setItem('draft index', entries);
    },
    /**
     * request
     *
     * Request drafts from asyncStorage or in-memory cache.
     *
     * @param {Function} callback If a callback is provided, invoke
     *                            with list of threadless drafts as
     *                            arguments.
     * @return {Undefined} void return.
     */
    request: function() {
      function handler() {
        isCached = true;
      }

      // Loading from storage only happens when the
      // app first opens.
      if (isCached) {
        setTimeout(function() {
          handler();
        });
      } else {
        asyncStorage.getItem('draft index', function(records) {

          draftIndex = new Map(records || []);

          handler();
        });
      }
    }
  };

  /**
   * Draft
   *
   * A message-like object containing unsent
   * message content to be stored temporarily
   * in a Drafts collection.
   *
   * @param {Object}  draft  Draft or empty object
   */
  function Draft(opts) {
    var draft = opts || {};

    this.recipients = draft.recipients || [''];
    this.content = draft.content || [];
    this.subject = draft.subject || '';
    this.timestamp = draft.timestamp || Date.now();
    this.id = draft.id || guid();
    this.type = draft.type || 'sms';
  }

  Draft.prototype = {
    constructor: Draft,
    get hasDrafts() {
      return true;
    }
  };

  exports.Draft = Draft;
  exports.Drafts = Drafts;

}(this));
