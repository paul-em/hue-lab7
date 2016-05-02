var recording = false;
var data, startTime, $btn, $recordings;

// wait for dom elements to be loaded
document.addEventListener("DOMContentLoaded", function (event) {
    // access dom elements
    $btn = document.querySelector("button");
    $recordings = document.querySelector("#recordings");

    updateList();

    // add button click action
    $btn.addEventListener("click", function () {
        // toggle recording state
        recording = !recording;

        if (recording) {
            // set starting time and make sure the data store is empty
            startTime = Date.now();
            data = [];
            $btn.innerText = "Stop recording"
        } else {
            // stopped recording - now save it in db and update the list
            saveRecording(data, function () {
                updateList();
            });
            $btn.innerText = "Record";
        }
    });
});

var chromeWindow = chrome.app.window.current();
chromeWindow.onBoundsChanged.addListener(function (e) {
    if (recording) {
        // push the necessary data into the temporary data array
        data.push({
            time: Date.now() - startTime,
            left: chromeWindow.innerBounds.left,
            top: chromeWindow.innerBounds.top,
            width: chromeWindow.innerBounds.width,
            height: chromeWindow.innerBounds.height
        });
    }
});

function playRecording(recordingData, startTime) {
    // set startTime on first call of this function
    if (!startTime) {
        startTime = Date.now();
    }
    window.requestAnimationFrame(function () {
        // get the current time of the animation
        var time = Date.now() - startTime;

        // find the corresponding recorded data for the time
        // Note: this could be done more efficiently by keeping track of the index and starting from this position instead of always starting to search from scratch
        var data = recordingData.find(function (item) {
            if (item.time >= time) {
                return true;
            }
        });

        // set the data and go to the next frame only if there actually is any data
        if (data) {
            chromeWindow.innerBounds.left = data.left;
            chromeWindow.innerBounds.top = data.top;
            chromeWindow.innerBounds.width = data.width;
            chromeWindow.innerBounds.height = data.height;
            playRecording(recordingData, startTime);
        }
    });

}


function updateList() {
    getRecordings(function (recordings) {
        // reset the $recordings dom element
        $recordings.innerHTML = "";
        // the database gave us the array with the oldest first, but we want to display the youngest first, so we reverse the array before looping
        recordings.reverse().forEach(function (recordingId) {
            // create a new DOM element for the entry and insert the id as Date object string
            var p = document.createElement("p");
            p.innerText = new Date(recordingId).toDateString();
            p.addEventListener("click", function () {
                // on click on this object play the recording!
                getRecording(recordingId, function (recording) {
                    playRecording(recording.data);
                });
            });
            // append the recorded data to the DOM
            $recordings.appendChild(p);

        });
    });
}


function getRecording(id, callback) {
    openDb(function (db) {
        var tx = db.transaction("Recordings", "readonly");
        var store = tx.objectStore("Recordings");

        // get the item with the matching id
        var getRecording = store.get(id);
        getRecording.onsuccess = function () {
            callback(getRecording.result);
        };
        // Close the db when the transaction is done
        tx.oncomplete = function () {
            db.close();

        };
    });
}

function getRecordings(callback) {
    openDb(function (db) {
        var tx = db.transaction("Recordings", "readonly");
        var store = tx.objectStore("Recordings");

        // just get all keys, we don't need all the data at this time
        var getAll = store.getAllKeys();
        getAll.onsuccess = function () {
            callback(getAll.result);
        };
        // Close the db when the transaction is done
        tx.oncomplete = function () {
            db.close();

        };
    });
}


function saveRecording(data, callback) {
    openDb(function (db) {
        // Start a new transaction
        var tx = db.transaction("Recordings", "readwrite");
        var store = tx.objectStore("Recordings");

        // Add the data with date object as ID
        store.put({id: Date.now(), data: data});

        // Close the db when the transaction is done
        tx.oncomplete = function () {
            db.close();
            callback();
        };
    });
}


// helper function for opening the db
function openDb(callback) {
    var request = indexedDB.open("MoveIt", 1);

    request.onupgradeneeded = function (event) {
        var db = event.target.result;
        db.createObjectStore("Recordings", {keyPath: "id"});
    };
    request.onsuccess = function (event) {
        callback(event.target.result);
    };

    request.onerror = function (e) {
        console.log('error', e);
    }
}