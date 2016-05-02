var recording = false;
var data, startTime, $btn, $recordings;

document.addEventListener("DOMContentLoaded", function (event) {
    $btn = document.querySelector("button");
    $recordings = document.querySelector("#recordings");
    updateList();
    $btn.addEventListener("click", function () {
        console.log("clicked");
        recording = !recording;
        if (recording) {
            startTime = Date.now();
            data = [];
            $btn.innerText = "Stop recording"
        } else {
            console.log("stopped");
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
    if (!startTime) {
        startTime = Date.now();
    }
    window.requestAnimationFrame(function () {
        var time = Date.now() - startTime;

        var data = recordingData.find(function (item) {
            if (item.time >= time) {
                return true;
            }
        });
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
        $recordings.innerHTML = "";
        recordings.reverse().forEach(function (recordingId) {
            var p = document.createElement("p");
            p.innerText = new Date(recordingId);
            p.addEventListener("click", function () {
                getRecording(recordingId, function (recording) {
                    playRecording(recording.data);
                });
            });
            $recordings.appendChild(p);

        });
    });
}


function getRecording(id, callback) {
    openDb(function (db) {
        var tx = db.transaction("Recordings", "readonly");
        var store = tx.objectStore("Recordings");
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
        var getAll = store.getAllKeys();
        getAll.onsuccess = function () {
            console.log(getAll.result);
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

        // Add some data
        store.put({id: Date.now(), data: data});

        // Close the db when the transaction is done
        tx.oncomplete = function () {
            db.close();
            callback();
        };
    });
}

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