"use strict";
exports.__esModule = true;
// A basic token bucket that throttles based on key
// From: https://kendru.github.io/javascript/2018/12/28/rate-limiting-in-javascript-with-a-token-bucket/
// Written by:
//
// DJ Petersen <thedeej@amazon.com>
// Katy Johnson <katyjohn@amazon.com>
// Lin Yang <linyangc@amazon.com>
//
// Heavily adapted.
// This token bucket works a little different from others in that it has a total
// bucket size, but also contains "child" buckets for individual events. That way
// a single event can not overwhelm the bucket.
//
// Refills using a delta from when the
// method was called rather than a timer.
var EventTokenBucket = /** @class */ (function () {
    /**
     * Instantiate our event bucket and set the arguments to
     * the interal variables
     *
     * @param options Takes the capactiy, totalCapacity and the fillPerSecond
     */
    function EventTokenBucket(options) {
        // Two variables to keep track of how many tokens each event has
        // and when was the last time each event was called
        this.EventBuckets = {};
        this.EventFilled = {};
        // We keep an publicly available map of how many times an individual
        // event was throttled. Consumers of this class can use that to
        // emit how many events were throttled.
        this.ThrottledEvents = {};
        this.NumberOfThrottledEvents = 0;
        this.capacity = options.capacity;
        this.totalCapacity = options.totalCapacity;
        this.totalBucketSize = options.totalCapacity;
        this.fillPerSecond = options.fillPerSecond;
    }
    EventTokenBucket.prototype.refillTotalBucket = function () {
        var now = Math.floor(Date.now() / 1000);
        this.totalLastFilled = typeof this.totalLastFilled === "undefined" ? now : this.totalLastFilled;
        // We've already divided by 1000, so this timeDelta will represent
        // the number of seconds elapsed since the last time the method was called
        var timeDelta = now - this.totalLastFilled;
        // If we somehow calculate incorrectly the bucket size as something
        // over what the potential capacity could be we default to the maxiumum
        // bucket size
        this.totalBucketSize = Math.min(this.totalCapacity, this.totalBucketSize + Math.floor(timeDelta * this.fillPerSecond));
        this.totalLastFilled = now;
    };
    /**
     *
     * @param eventName This will map to the bucket that the event was taken from
     */
    EventTokenBucket.prototype.refill = function (eventName) {
        var lastFilled;
        var now = Math.floor(Date.now() / 1000);
        // We look up when was the last time we called the refill
        // method for this event, if it was never called we set it
        // to the current time
        if (typeof this.EventFilled[eventName] === "undefined") {
            this.EventFilled[eventName] = now;
            lastFilled = now;
        }
        else {
            lastFilled = this.EventFilled[eventName];
        }
        // We've already divided by 1000, so this timeDelta will represent
        // the number of seconds elapsed since the last time the method was called
        var timeDelta = now - lastFilled;
        // If we somehow calculate incorrectly the bucket size as something
        // over what the potential capacity could be we default to the maxiumum
        // bucket size
        this.EventBuckets[eventName] = Math.min(this.capacity, this.EventBuckets[eventName] + Math.floor(timeDelta * this.fillPerSecond));
        this.EventFilled[eventName] = now;
    };
    EventTokenBucket.prototype.take = function (eventName) {
        // In the case of new event we create a new eventBucket for it
        // otherwise we calculate the refill rate for an existing event
        if (typeof this.EventBuckets[eventName] === "undefined") {
            this.EventBuckets[eventName] = this.capacity;
        }
        else {
            this.refill(eventName);
        }
        this.refillTotalBucket();
        // We check both that the specific event bucket and the total bucket size
        // are greater than 0
        if (this.EventBuckets[eventName] > 0 && this.totalBucketSize > 0) {
            // Subtract both from the event bucket and the overall bucket
            this.EventBuckets[eventName] -= 1;
            this.totalBucketSize -= 1;
            return true;
        }
        else {
            // If we do end up throttling an event
            // we keep track of how many times it was
            // throttled
            this.ThrottledEvents[eventName] =
                typeof this.ThrottledEvents[eventName] !== "undefined" ? this.ThrottledEvents[eventName] + 1 : 1;
            this.NumberOfThrottledEvents++;
        }
        return false;
    };
    return EventTokenBucket;
}());
exports.EventTokenBucket = EventTokenBucket;
