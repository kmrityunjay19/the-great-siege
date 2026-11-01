
  var Module = typeof Module != 'undefined' ? Module : {};

  Module['expectedDataFileDownloads'] ??= 0;
  Module['expectedDataFileDownloads']++;
  (() => {
    // Do not attempt to redownload the virtual filesystem data when in a pthread or a Wasm Worker context.
    var isPthread = typeof ENVIRONMENT_IS_PTHREAD != 'undefined' && ENVIRONMENT_IS_PTHREAD;
    var isWasmWorker = typeof ENVIRONMENT_IS_WASM_WORKER != 'undefined' && ENVIRONMENT_IS_WASM_WORKER;
    if (isPthread || isWasmWorker) return;
    var isNode = typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.node === 'string';
    function loadPackage(metadata) {

      var PACKAGE_PATH = '';
      if (typeof window === 'object') {
        PACKAGE_PATH = window['encodeURIComponent'](window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/');
      } else if (typeof process === 'undefined' && typeof location !== 'undefined') {
        // web worker
        PACKAGE_PATH = encodeURIComponent(location.pathname.substring(0, location.pathname.lastIndexOf('/')) + '/');
      }
      var PACKAGE_NAME = '/Users/mrityunjaykumar/Documents/The Great Siege/build/extras.data';
      var REMOTE_PACKAGE_BASE = 'extras.data';
      var REMOTE_PACKAGE_NAME = Module['locateFile'] ? Module['locateFile'](REMOTE_PACKAGE_BASE, '') : REMOTE_PACKAGE_BASE;
var REMOTE_PACKAGE_SIZE = metadata['remote_package_size'];

      function fetchRemotePackage(packageName, packageSize, callback, errback) {
        if (isNode) {
          require('fs').readFile(packageName, (err, contents) => {
            if (err) {
              errback(err);
            } else {
              callback(contents.buffer);
            }
          });
          return;
        }
        Module['dataFileDownloads'] ??= {};
        fetch(packageName)
          .catch((cause) => Promise.reject(new Error(`Network Error: ${packageName}`, {cause}))) // If fetch fails, rewrite the error to include the failing URL & the cause.
          .then((response) => {
            if (!response.ok) {
              return Promise.reject(new Error(`${response.status}: ${response.url}`));
            }

            if (!response.body && response.arrayBuffer) { // If we're using the polyfill, readers won't be available...
              return response.arrayBuffer().then(callback);
            }

            const reader = response.body.getReader();
            const iterate = () => reader.read().then(handleChunk).catch((cause) => {
              return Promise.reject(new Error(`Unexpected error while handling : ${response.url} ${cause}`, {cause}));
            });

            const chunks = [];
            const headers = response.headers;
            const total = Number(headers.get('Content-Length') ?? packageSize);
            let loaded = 0;

            const handleChunk = ({done, value}) => {
              if (!done) {
                chunks.push(value);
                loaded += value.length;
                Module['dataFileDownloads'][packageName] = {loaded, total};

                let totalLoaded = 0;
                let totalSize = 0;

                for (const download of Object.values(Module['dataFileDownloads'])) {
                  totalLoaded += download.loaded;
                  totalSize += download.total;
                }

                Module['setStatus']?.(`Downloading data... (${totalLoaded}/${totalSize})`);
                return iterate();
              } else {
                const packageData = new Uint8Array(chunks.map((c) => c.length).reduce((a, b) => a + b, 0));
                let offset = 0;
                for (const chunk of chunks) {
                  packageData.set(chunk, offset);
                  offset += chunk.length;
                }
                callback(packageData.buffer);
              }
            };

            Module['setStatus']?.('Downloading data...');
            return iterate();
          });
      };

      function handleError(error) {
        console.error('package error:', error);
      };

      var fetchedCallback = null;
      var fetched = Module['getPreloadedPackage'] ? Module['getPreloadedPackage'](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE) : null;

      if (!fetched) fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE, (data) => {
        if (fetchedCallback) {
          fetchedCallback(data);
          fetchedCallback = null;
        } else {
          fetched = data;
        }
      }, handleError);

    function runWithFS(Module) {

      function assert(check, msg) {
        if (!check) throw msg + new Error().stack;
      }
Module['FS_createPath']("/", "data", true, true);
Module['FS_createPath']("/data", "ENCYC", true, true);
Module['FS_createPath']("/data/ENCYC", "FIRM", true, true);
Module['FS_createPath']("/data/ENCYC", "GOD", true, true);
Module['FS_createPath']("/data/ENCYC", "MONSTER", true, true);
Module['FS_createPath']("/data/ENCYC", "SEAT", true, true);
Module['FS_createPath']("/data/ENCYC", "UNIT", true, true);
Module['FS_createPath']("/data", "ENCYC2", true, true);
Module['FS_createPath']("/data/ENCYC2", "GOD", true, true);
Module['FS_createPath']("/data/ENCYC2", "SEAT", true, true);
Module['FS_createPath']("/data/ENCYC2", "UNIT", true, true);
Module['FS_createPath']("/data", "SCENARI2", true, true);
Module['FS_createPath']("/data", "SCENARIO", true, true);
Module['FS_createPath']("/data", "TUTORIAL", true, true);

      /** @constructor */
      function DataRequest(start, end, audio) {
        this.start = start;
        this.end = end;
        this.audio = audio;
      }
      DataRequest.prototype = {
        requests: {},
        open: function(mode, name) {
          this.name = name;
          this.requests[name] = this;
          Module['addRunDependency'](`fp ${this.name}`);
        },
        send: function() {},
        onload: function() {
          var byteArray = this.byteArray.subarray(this.start, this.end);
          this.finish(byteArray);
        },
        finish: function(byteArray) {
          var that = this;
          // canOwn this data in the filesystem, it is a slide into the heap that will never change
          Module['FS_createDataFile'](this.name, null, byteArray, true, true, true);
          Module['removeRunDependency'](`fp ${that.name}`);
          this.requests[this.name] = null;
        }
      };

      var files = metadata['files'];
      for (var i = 0; i < files.length; ++i) {
        new DataRequest(files[i]['start'], files[i]['end'], files[i]['audio'] || 0).open('GET', files[i]['filename']);
      }

      function processPackageData(arrayBuffer) {
        assert(arrayBuffer, 'Loading data file failed.');
        assert(arrayBuffer.constructor.name === ArrayBuffer.name, 'bad input to processPackageData');
        var byteArray = new Uint8Array(arrayBuffer);
        var curr;
        // Reuse the bytearray from the XHR as the source for file reads.
          DataRequest.prototype.byteArray = byteArray;
          var files = metadata['files'];
          for (var i = 0; i < files.length; ++i) {
            DataRequest.prototype.requests[files[i].filename].onload();
          }          Module['removeRunDependency']('datafile_/Users/mrityunjaykumar/Documents/The Great Siege/build/extras.data');

      };
      Module['addRunDependency']('datafile_/Users/mrityunjaykumar/Documents/The Great Siege/build/extras.data');

      Module['preloadResults'] ??= {};

      Module['preloadResults'][PACKAGE_NAME] = {fromCache: false};
      if (fetched) {
        processPackageData(fetched);
        fetched = null;
      } else {
        fetchedCallback = processPackageData;
      }

    }
    if (Module['calledRun']) {
      runWithFS(Module);
    } else {
      (Module['preRun'] ??= []).push(runWithFS); // FS is not initialized yet, wait for it
    }

    }
    loadPackage({"files": [{"filename": "/data/ENCYC/FIRM/FACTORY.COL", "start": 0, "end": 776}, {"filename": "/data/ENCYC/FIRM/FACTORY.ICN", "start": 776, "end": 354444}, {"filename": "/data/ENCYC/FIRM/FORT.COL", "start": 354444, "end": 355220}, {"filename": "/data/ENCYC/FIRM/FORT.ICN", "start": 355220, "end": 708888}, {"filename": "/data/ENCYC/FIRM/HARBOR.COL", "start": 708888, "end": 709664}, {"filename": "/data/ENCYC/FIRM/HARBOR.ICN", "start": 709664, "end": 1063332}, {"filename": "/data/ENCYC/FIRM/INN.COL", "start": 1063332, "end": 1064108}, {"filename": "/data/ENCYC/FIRM/INN.ICN", "start": 1064108, "end": 1417776}, {"filename": "/data/ENCYC/FIRM/MARKET.COL", "start": 1417776, "end": 1418552}, {"filename": "/data/ENCYC/FIRM/MARKET.ICN", "start": 1418552, "end": 1772220}, {"filename": "/data/ENCYC/FIRM/MINE.COL", "start": 1772220, "end": 1772996}, {"filename": "/data/ENCYC/FIRM/MINE.ICN", "start": 1772996, "end": 2126664}, {"filename": "/data/ENCYC/FIRM/SCIENCE.COL", "start": 2126664, "end": 2127440}, {"filename": "/data/ENCYC/FIRM/SCIENCE.ICN", "start": 2127440, "end": 2481108}, {"filename": "/data/ENCYC/FIRM/WARFACT.COL", "start": 2481108, "end": 2481884}, {"filename": "/data/ENCYC/FIRM/WARFACT.ICN", "start": 2481884, "end": 2835552}, {"filename": "/data/ENCYC/GOD/CHINESE.COL", "start": 2835552, "end": 2836328}, {"filename": "/data/ENCYC/GOD/CHINESE.ICN", "start": 2836328, "end": 3189996}, {"filename": "/data/ENCYC/GOD/GREEK.COL", "start": 3189996, "end": 3190772}, {"filename": "/data/ENCYC/GOD/GREEK.ICN", "start": 3190772, "end": 3544440}, {"filename": "/data/ENCYC/GOD/JAPANESE.COL", "start": 3544440, "end": 3545216}, {"filename": "/data/ENCYC/GOD/JAPANESE.ICN", "start": 3545216, "end": 3898884}, {"filename": "/data/ENCYC/GOD/MAYA.COL", "start": 3898884, "end": 3899660}, {"filename": "/data/ENCYC/GOD/MAYA.ICN", "start": 3899660, "end": 4253328}, {"filename": "/data/ENCYC/GOD/NORMAN.COL", "start": 4253328, "end": 4254104}, {"filename": "/data/ENCYC/GOD/NORMAN.ICN", "start": 4254104, "end": 4607772}, {"filename": "/data/ENCYC/GOD/PERSIAN.COL", "start": 4607772, "end": 4608548}, {"filename": "/data/ENCYC/GOD/PERSIAN.ICN", "start": 4608548, "end": 4962216}, {"filename": "/data/ENCYC/GOD/VIKING.COL", "start": 4962216, "end": 4962992}, {"filename": "/data/ENCYC/GOD/VIKING.ICN", "start": 4962992, "end": 5316660}, {"filename": "/data/ENCYC/MONSTER/FIREKIN.COL", "start": 5316660, "end": 5317436}, {"filename": "/data/ENCYC/MONSTER/FIREKIN.ICN", "start": 5317436, "end": 5671104}, {"filename": "/data/ENCYC/MONSTER/GIANTET.COL", "start": 5671104, "end": 5671880}, {"filename": "/data/ENCYC/MONSTER/GIANTET.ICN", "start": 5671880, "end": 6025548}, {"filename": "/data/ENCYC/MONSTER/GITH.COL", "start": 6025548, "end": 6026324}, {"filename": "/data/ENCYC/MONSTER/GITH.ICN", "start": 6026324, "end": 6379992}, {"filename": "/data/ENCYC/MONSTER/GNOLL.COL", "start": 6379992, "end": 6380768}, {"filename": "/data/ENCYC/MONSTER/GNOLL.ICN", "start": 6380768, "end": 6734436}, {"filename": "/data/ENCYC/MONSTER/GOBLIN.COL", "start": 6734436, "end": 6735212}, {"filename": "/data/ENCYC/MONSTER/GOBLIN.ICN", "start": 6735212, "end": 7088880}, {"filename": "/data/ENCYC/MONSTER/GREMJERM.COL", "start": 7088880, "end": 7089656}, {"filename": "/data/ENCYC/MONSTER/GREMJERM.ICN", "start": 7089656, "end": 7443324}, {"filename": "/data/ENCYC/MONSTER/HEADLESS.COL", "start": 7443324, "end": 7444100}, {"filename": "/data/ENCYC/MONSTER/HEADLESS.ICN", "start": 7444100, "end": 7797768}, {"filename": "/data/ENCYC/MONSTER/HOBGLOB.COL", "start": 7797768, "end": 7798544}, {"filename": "/data/ENCYC/MONSTER/HOBGLOB.ICN", "start": 7798544, "end": 8152212}, {"filename": "/data/ENCYC/MONSTER/LIZARD.COL", "start": 8152212, "end": 8152988}, {"filename": "/data/ENCYC/MONSTER/LIZARD.ICN", "start": 8152988, "end": 8506656}, {"filename": "/data/ENCYC/MONSTER/LYW.COL", "start": 8506656, "end": 8507432}, {"filename": "/data/ENCYC/MONSTER/LYW.ICN", "start": 8507432, "end": 8861100}, {"filename": "/data/ENCYC/MONSTER/MAN.COL", "start": 8861100, "end": 8861876}, {"filename": "/data/ENCYC/MONSTER/MAN.ICN", "start": 8861876, "end": 9215544}, {"filename": "/data/ENCYC/MONSTER/ROCKMAN.COL", "start": 9215544, "end": 9216320}, {"filename": "/data/ENCYC/MONSTER/ROCKMAN.ICN", "start": 9216320, "end": 9569988}, {"filename": "/data/ENCYC/MONSTER/SKELETON.COL", "start": 9569988, "end": 9570764}, {"filename": "/data/ENCYC/MONSTER/SKELETON.ICN", "start": 9570764, "end": 9924432}, {"filename": "/data/ENCYC/MONSTER/STRUCT_1.COL", "start": 9924432, "end": 9925208}, {"filename": "/data/ENCYC/MONSTER/STRUCT_1.ICN", "start": 9925208, "end": 10278876}, {"filename": "/data/ENCYC/MONSTER/STRUCT_2.COL", "start": 10278876, "end": 10279652}, {"filename": "/data/ENCYC/MONSTER/STRUCT_2.ICN", "start": 10279652, "end": 10633320}, {"filename": "/data/ENCYC/MONSTER/STRUCT_3.COL", "start": 10633320, "end": 10634096}, {"filename": "/data/ENCYC/MONSTER/STRUCT_3.ICN", "start": 10634096, "end": 10987764}, {"filename": "/data/ENCYC/MONSTER/STRUCT_4.COL", "start": 10987764, "end": 10988540}, {"filename": "/data/ENCYC/MONSTER/STRUCT_4.ICN", "start": 10988540, "end": 11342208}, {"filename": "/data/ENCYC/SEAT/CHINESE.COL", "start": 11342208, "end": 11342984}, {"filename": "/data/ENCYC/SEAT/CHINESE.ICN", "start": 11342984, "end": 11696652}, {"filename": "/data/ENCYC/SEAT/GREEK.COL", "start": 11696652, "end": 11697428}, {"filename": "/data/ENCYC/SEAT/GREEK.ICN", "start": 11697428, "end": 12051096}, {"filename": "/data/ENCYC/SEAT/JAPANESE.COL", "start": 12051096, "end": 12051872}, {"filename": "/data/ENCYC/SEAT/JAPANESE.ICN", "start": 12051872, "end": 12405540}, {"filename": "/data/ENCYC/SEAT/MAYA.COL", "start": 12405540, "end": 12406316}, {"filename": "/data/ENCYC/SEAT/MAYA.ICN", "start": 12406316, "end": 12759984}, {"filename": "/data/ENCYC/SEAT/NORMAN.COL", "start": 12759984, "end": 12760760}, {"filename": "/data/ENCYC/SEAT/NORMAN.ICN", "start": 12760760, "end": 13114428}, {"filename": "/data/ENCYC/SEAT/PERSIAN.COL", "start": 13114428, "end": 13115204}, {"filename": "/data/ENCYC/SEAT/PERSIAN.ICN", "start": 13115204, "end": 13468872}, {"filename": "/data/ENCYC/SEAT/VIKING.COL", "start": 13468872, "end": 13469648}, {"filename": "/data/ENCYC/SEAT/VIKING.ICN", "start": 13469648, "end": 13823316}, {"filename": "/data/ENCYC/UNIT/BALLISTA.COL", "start": 13823316, "end": 13824092}, {"filename": "/data/ENCYC/UNIT/BALLISTA.ICN", "start": 13824092, "end": 14177760}, {"filename": "/data/ENCYC/UNIT/CANNON.COL", "start": 14177760, "end": 14178536}, {"filename": "/data/ENCYC/UNIT/CANNON.ICN", "start": 14178536, "end": 14532204}, {"filename": "/data/ENCYC/UNIT/CARAVEL.COL", "start": 14532204, "end": 14532980}, {"filename": "/data/ENCYC/UNIT/CARAVEL.ICN", "start": 14532980, "end": 14886648}, {"filename": "/data/ENCYC/UNIT/CATAPULT.COL", "start": 14886648, "end": 14887424}, {"filename": "/data/ENCYC/UNIT/CATAPULT.ICN", "start": 14887424, "end": 15241092}, {"filename": "/data/ENCYC/UNIT/CHINESE.COL", "start": 15241092, "end": 15241868}, {"filename": "/data/ENCYC/UNIT/CHINESE.ICN", "start": 15241868, "end": 15595536}, {"filename": "/data/ENCYC/UNIT/EXPCART.COL", "start": 15595536, "end": 15596312}, {"filename": "/data/ENCYC/UNIT/EXPCART.ICN", "start": 15596312, "end": 15949980}, {"filename": "/data/ENCYC/UNIT/FLAMETHR.COL", "start": 15949980, "end": 15950756}, {"filename": "/data/ENCYC/UNIT/FLAMETHR.ICN", "start": 15950756, "end": 16304424}, {"filename": "/data/ENCYC/UNIT/GALLEON.COL", "start": 16304424, "end": 16305200}, {"filename": "/data/ENCYC/UNIT/GALLEON.ICN", "start": 16305200, "end": 16658868}, {"filename": "/data/ENCYC/UNIT/GREEK.COL", "start": 16658868, "end": 16659644}, {"filename": "/data/ENCYC/UNIT/GREEK.ICN", "start": 16659644, "end": 17013312}, {"filename": "/data/ENCYC/UNIT/JAPANESE.COL", "start": 17013312, "end": 17014088}, {"filename": "/data/ENCYC/UNIT/JAPANESE.ICN", "start": 17014088, "end": 17367756}, {"filename": "/data/ENCYC/UNIT/MAYA.COL", "start": 17367756, "end": 17368532}, {"filename": "/data/ENCYC/UNIT/MAYA.ICN", "start": 17368532, "end": 17722200}, {"filename": "/data/ENCYC/UNIT/NORMAN.COL", "start": 17722200, "end": 17722976}, {"filename": "/data/ENCYC/UNIT/NORMAN.ICN", "start": 17722976, "end": 18076644}, {"filename": "/data/ENCYC/UNIT/PERSIAN.COL", "start": 18076644, "end": 18077420}, {"filename": "/data/ENCYC/UNIT/PERSIAN.ICN", "start": 18077420, "end": 18431088}, {"filename": "/data/ENCYC/UNIT/TRANSPOR.COL", "start": 18431088, "end": 18431864}, {"filename": "/data/ENCYC/UNIT/TRANSPOR.ICN", "start": 18431864, "end": 18785532}, {"filename": "/data/ENCYC/UNIT/VESSEL.COL", "start": 18785532, "end": 18786308}, {"filename": "/data/ENCYC/UNIT/VESSEL.ICN", "start": 18786308, "end": 19139976}, {"filename": "/data/ENCYC/UNIT/VIKING.COL", "start": 19139976, "end": 19140752}, {"filename": "/data/ENCYC/UNIT/VIKING.ICN", "start": 19140752, "end": 19494420}, {"filename": "/data/ENCYC2/GOD/EGYPTIAN.COL", "start": 19494420, "end": 19495196}, {"filename": "/data/ENCYC2/GOD/EGYPTIAN.ICN", "start": 19495196, "end": 19848864}, {"filename": "/data/ENCYC2/GOD/INDIAN.COL", "start": 19848864, "end": 19849640}, {"filename": "/data/ENCYC2/GOD/INDIAN.ICN", "start": 19849640, "end": 20203308}, {"filename": "/data/ENCYC2/GOD/ZULU.COL", "start": 20203308, "end": 20204084}, {"filename": "/data/ENCYC2/GOD/ZULU.ICN", "start": 20204084, "end": 20557752}, {"filename": "/data/ENCYC2/SEAT/EGYPTIAN.COL", "start": 20557752, "end": 20558528}, {"filename": "/data/ENCYC2/SEAT/EGYPTIAN.ICN", "start": 20558528, "end": 20912196}, {"filename": "/data/ENCYC2/SEAT/INDIAN.COL", "start": 20912196, "end": 20912972}, {"filename": "/data/ENCYC2/SEAT/INDIAN.ICN", "start": 20912972, "end": 21266640}, {"filename": "/data/ENCYC2/SEAT/ZULU.COL", "start": 21266640, "end": 21267416}, {"filename": "/data/ENCYC2/SEAT/ZULU.ICN", "start": 21267416, "end": 21621084}, {"filename": "/data/ENCYC2/UNIT/EGYPTIAN.COL", "start": 21621084, "end": 21621860}, {"filename": "/data/ENCYC2/UNIT/EGYPTIAN.ICN", "start": 21621860, "end": 21975528}, {"filename": "/data/ENCYC2/UNIT/F_BALLIS.COL", "start": 21975528, "end": 21976304}, {"filename": "/data/ENCYC2/UNIT/F_BALLIS.ICN", "start": 21976304, "end": 22329972}, {"filename": "/data/ENCYC2/UNIT/INDIAN.COL", "start": 22329972, "end": 22330748}, {"filename": "/data/ENCYC2/UNIT/INDIAN.ICN", "start": 22330748, "end": 22684416}, {"filename": "/data/ENCYC2/UNIT/ZULU.COL", "start": 22684416, "end": 22685192}, {"filename": "/data/ENCYC2/UNIT/ZULU.ICN", "start": 22685192, "end": 23038860}, {"filename": "/data/SCENARI2/SCN_01.SCN", "start": 23038860, "end": 23638969}, {"filename": "/data/SCENARI2/SCN_01.SCP", "start": 23638969, "end": 23746609}, {"filename": "/data/SCENARI2/SCN_01.SCT", "start": 23746609, "end": 23746999}, {"filename": "/data/SCENARI2/SCN_02.SCN", "start": 23746999, "end": 24353183}, {"filename": "/data/SCENARI2/SCN_02.SCP", "start": 24353183, "end": 24460823}, {"filename": "/data/SCENARI2/SCN_02.SCT", "start": 24460823, "end": 24461316}, {"filename": "/data/SCENARI2/SCN_03.SCN", "start": 24461316, "end": 25072655}, {"filename": "/data/SCENARI2/SCN_03.SCP", "start": 25072655, "end": 25180295}, {"filename": "/data/SCENARI2/SCN_03.SCT", "start": 25180295, "end": 25180818}, {"filename": "/data/SCENARI2/SCN_04.SCN", "start": 25180818, "end": 25813835}, {"filename": "/data/SCENARI2/SCN_04.SCP", "start": 25813835, "end": 25921475}, {"filename": "/data/SCENARI2/SCN_04.SCT", "start": 25921475, "end": 25921980}, {"filename": "/data/SCENARI2/SCN_05.SCN", "start": 25921980, "end": 26528627}, {"filename": "/data/SCENARI2/SCN_05.SCP", "start": 26528627, "end": 26636267}, {"filename": "/data/SCENARI2/SCN_05.SCT", "start": 26636267, "end": 26636663}, {"filename": "/data/SCENARI2/SCN_06.SCN", "start": 26636663, "end": 27282140}, {"filename": "/data/SCENARI2/SCN_06.SCP", "start": 27282140, "end": 27389780}, {"filename": "/data/SCENARI2/SCN_06.SCT", "start": 27389780, "end": 27390119}, {"filename": "/data/SCENARI2/SCN_07.SCN", "start": 27390119, "end": 27996953}, {"filename": "/data/SCENARI2/SCN_07.SCP", "start": 27996953, "end": 28104593}, {"filename": "/data/SCENARI2/SCN_07.SCT", "start": 28104593, "end": 28105031}, {"filename": "/data/SCENARI2/SCN_08.SCN", "start": 28105031, "end": 28732274}, {"filename": "/data/SCENARI2/SCN_08.SCP", "start": 28732274, "end": 28839914}, {"filename": "/data/SCENARI2/SCN_08.SCT", "start": 28839914, "end": 28840397}, {"filename": "/data/SCENARI2/SCN_09.SCN", "start": 28840397, "end": 29442669}, {"filename": "/data/SCENARI2/SCN_09.SCP", "start": 29442669, "end": 29550309}, {"filename": "/data/SCENARI2/SCN_09.SCT", "start": 29550309, "end": 29550602}, {"filename": "/data/SCENARI2/SCN_10.SCN", "start": 29550602, "end": 30139567}, {"filename": "/data/SCENARI2/SCN_10.SCP", "start": 30139567, "end": 30247207}, {"filename": "/data/SCENARI2/SCN_10.SCT", "start": 30247207, "end": 30247601}, {"filename": "/data/SCENARI2/SCN_11.SCN", "start": 30247601, "end": 30853158}, {"filename": "/data/SCENARI2/SCN_11.SCP", "start": 30853158, "end": 30960798}, {"filename": "/data/SCENARI2/SCN_11.SCT", "start": 30960798, "end": 30961087}, {"filename": "/data/SCENARI2/SCN_12.SCN", "start": 30961087, "end": 31652655}, {"filename": "/data/SCENARI2/SCN_12.SCP", "start": 31652655, "end": 31760295}, {"filename": "/data/SCENARI2/SCN_12.SCT", "start": 31760295, "end": 31760595}, {"filename": "/data/SCENARI2/SCN_13.SCN", "start": 31760595, "end": 32418959}, {"filename": "/data/SCENARI2/SCN_13.SCP", "start": 32418959, "end": 32526599}, {"filename": "/data/SCENARI2/SCN_13.SCT", "start": 32526599, "end": 32527051}, {"filename": "/data/SCENARI2/SCN_14.SCN", "start": 32527051, "end": 33166393}, {"filename": "/data/SCENARI2/SCN_14.SCP", "start": 33166393, "end": 33274033}, {"filename": "/data/SCENARI2/SCN_14.SCT", "start": 33274033, "end": 33274336}, {"filename": "/data/SCENARI2/SCN_15.SCN", "start": 33274336, "end": 33889946}, {"filename": "/data/SCENARI2/SCN_15.SCP", "start": 33889946, "end": 33997586}, {"filename": "/data/SCENARI2/SCN_15.SCT", "start": 33997586, "end": 33998009}, {"filename": "/data/SCENARI2/config.txt", "start": 33998009, "end": 33998267}, {"filename": "/data/SCENARIO/7FOR7.SCN", "start": 33998267, "end": 34669797}, {"filename": "/data/SCENARIO/7FOR7.SCP", "start": 34669797, "end": 34777437}, {"filename": "/data/SCENARIO/7FOR7.SCT", "start": 34777437, "end": 34778010}, {"filename": "/data/SCENARIO/C&D.SCN", "start": 34778010, "end": 35422074}, {"filename": "/data/SCENARIO/C&D.SCP", "start": 35422074, "end": 35529714}, {"filename": "/data/SCENARIO/C&D.SCT", "start": 35529714, "end": 35530028}, {"filename": "/data/SCENARIO/DESBOW.SCN", "start": 35530028, "end": 36198427}, {"filename": "/data/SCENARIO/DESBOW.SCP", "start": 36198427, "end": 36306067}, {"filename": "/data/SCENARIO/DESBOW.SCT", "start": 36306067, "end": 36306602}, {"filename": "/data/SCENARIO/DESPERDO.SCN", "start": 36306602, "end": 36988843}, {"filename": "/data/SCENARIO/DESPERDO.SCP", "start": 36988843, "end": 37096483}, {"filename": "/data/SCENARIO/DESPERDO.SCT", "start": 37096483, "end": 37097010}, {"filename": "/data/SCENARIO/ERADICAT.SCN", "start": 37097010, "end": 37723301}, {"filename": "/data/SCENARIO/ERADICAT.SCP", "start": 37723301, "end": 37830941}, {"filename": "/data/SCENARIO/ERADICAT.SCT", "start": 37830941, "end": 37831533}, {"filename": "/data/SCENARIO/FTFRAUTN.SCN", "start": 37831533, "end": 38524496}, {"filename": "/data/SCENARIO/FTFRAUTN.SCP", "start": 38524496, "end": 38632136}, {"filename": "/data/SCENARIO/FTFRAUTN.SCT", "start": 38632136, "end": 38632528}, {"filename": "/data/SCENARIO/H&M.SCN", "start": 38632528, "end": 39247437}, {"filename": "/data/SCENARIO/H&M.SCP", "start": 39247437, "end": 39355077}, {"filename": "/data/SCENARIO/H&M.SCT", "start": 39355077, "end": 39355716}, {"filename": "/data/SCENARIO/INSULPOS.SCN", "start": 39355716, "end": 40010368}, {"filename": "/data/SCENARIO/INSULPOS.SCP", "start": 40010368, "end": 40118008}, {"filename": "/data/SCENARIO/INSULPOS.SCT", "start": 40118008, "end": 40118723}, {"filename": "/data/SCENARIO/IRONFIST.SCN", "start": 40118723, "end": 40841249}, {"filename": "/data/SCENARIO/IRONFIST.SCP", "start": 40841249, "end": 40948889}, {"filename": "/data/SCENARIO/IRONFIST.SCT", "start": 40948889, "end": 40949657}, {"filename": "/data/SCENARIO/KUKULCNS.SCN", "start": 40949657, "end": 41610426}, {"filename": "/data/SCENARIO/KUKULCNS.SCP", "start": 41610426, "end": 41718066}, {"filename": "/data/SCENARIO/KUKULCNS.SCT", "start": 41718066, "end": 41718461}, {"filename": "/data/SCENARIO/MAKEBREK.SCN", "start": 41718461, "end": 42460021}, {"filename": "/data/SCENARIO/MAKEBREK.SCP", "start": 42460021, "end": 42567661}, {"filename": "/data/SCENARIO/MAKEBREK.SCT", "start": 42567661, "end": 42568219}, {"filename": "/data/SCENARIO/MELTPOT.SCN", "start": 42568219, "end": 43252927}, {"filename": "/data/SCENARIO/MELTPOT.SCP", "start": 43252927, "end": 43360567}, {"filename": "/data/SCENARIO/MELTPOT.SCT", "start": 43360567, "end": 43360886}, {"filename": "/data/SCENARIO/MONORWAR.SCN", "start": 43360886, "end": 44076337}, {"filename": "/data/SCENARIO/MONORWAR.SCP", "start": 44076337, "end": 44183977}, {"filename": "/data/SCENARIO/MONORWAR.SCT", "start": 44183977, "end": 44184433}, {"filename": "/data/SCENARIO/NEWWORLD.SCN", "start": 44184433, "end": 44801576}, {"filename": "/data/SCENARIO/NEWWORLD.SCP", "start": 44801576, "end": 44909216}, {"filename": "/data/SCENARIO/NEWWORLD.SCT", "start": 44909216, "end": 44909736}, {"filename": "/data/SCENARIO/NORMAN.SCN", "start": 44909736, "end": 45526852}, {"filename": "/data/SCENARIO/NORMAN.SCP", "start": 45526852, "end": 45634492}, {"filename": "/data/SCENARIO/NORMAN.SCT", "start": 45634492, "end": 45634887}, {"filename": "/data/SCENARIO/NOTLOST.SCN", "start": 45634887, "end": 46315185}, {"filename": "/data/SCENARIO/NOTLOST.SCP", "start": 46315185, "end": 46422825}, {"filename": "/data/SCENARIO/NOTLOST.SCT", "start": 46422825, "end": 46423611}, {"filename": "/data/SCENARIO/PIRATES.SCN", "start": 46423611, "end": 47107845}, {"filename": "/data/SCENARIO/PIRATES.SCP", "start": 47107845, "end": 47215485}, {"filename": "/data/SCENARIO/PIRATES.SCT", "start": 47215485, "end": 47216006}, {"filename": "/data/SCENARIO/PRNCTKAO.SCN", "start": 47216006, "end": 47869964}, {"filename": "/data/SCENARIO/PRNCTKAO.SCP", "start": 47869964, "end": 47977604}, {"filename": "/data/SCENARIO/PRNCTKAO.SCT", "start": 47977604, "end": 47978090}, {"filename": "/data/SCENARIO/QUESUCCN.SCN", "start": 47978090, "end": 48642503}, {"filename": "/data/SCENARIO/QUESUCCN.SCP", "start": 48642503, "end": 48750143}, {"filename": "/data/SCENARIO/QUESUCCN.SCT", "start": 48750143, "end": 48750542}, {"filename": "/data/SCENARIO/RESDEP.SCN", "start": 48750542, "end": 49451339}, {"filename": "/data/SCENARIO/RESDEP.SCP", "start": 49451339, "end": 49558979}, {"filename": "/data/SCENARIO/RESDEP.SCT", "start": 49558979, "end": 49559469}, {"filename": "/data/SCENARIO/TREADCAR.SCN", "start": 49559469, "end": 50215929}, {"filename": "/data/SCENARIO/TREADCAR.SCP", "start": 50215929, "end": 50323569}, {"filename": "/data/SCENARIO/TREADCAR.SCT", "start": 50323569, "end": 50323912}, {"filename": "/data/SCENARIO/VIKBLITZ.SCN", "start": 50323912, "end": 51030421}, {"filename": "/data/SCENARIO/VIKBLITZ.SCP", "start": 51030421, "end": 51138061}, {"filename": "/data/SCENARIO/VIKBLITZ.SCT", "start": 51138061, "end": 51138587}, {"filename": "/data/SCENARIO/WEAKENED.SCN", "start": 51138587, "end": 51810650}, {"filename": "/data/SCENARIO/WEAKENED.SCP", "start": 51810650, "end": 51918290}, {"filename": "/data/SCENARIO/WEAKENED.SCT", "start": 51918290, "end": 51918649}, {"filename": "/data/SCENARIO/config.txt", "start": 51918649, "end": 51918933}, {"filename": "/data/TUTORIAL/10CAPTUR.TUT", "start": 51918933, "end": 52540667}, {"filename": "/data/TUTORIAL/1BAS_MIL.TUT", "start": 52540667, "end": 53141480}, {"filename": "/data/TUTORIAL/2BAS_ECO.TUT", "start": 53141480, "end": 53742805}, {"filename": "/data/TUTORIAL/2B_TRADE.TUT", "start": 53742805, "end": 54350596}, {"filename": "/data/TUTORIAL/3RESEARC.TUT", "start": 54350596, "end": 54977077}, {"filename": "/data/TUTORIAL/4WEAPONS.TUT", "start": 54977077, "end": 55609575}, {"filename": "/data/TUTORIAL/5BAS_NAV.TUT", "start": 55609575, "end": 56267035}, {"filename": "/data/TUTORIAL/6SEATRAD.TUT", "start": 56267035, "end": 56936693}, {"filename": "/data/TUTORIAL/7MERCENA.TUT", "start": 56936693, "end": 57555815}, {"filename": "/data/TUTORIAL/8FRYHTAN.TUT", "start": 57555815, "end": 58226713}, {"filename": "/data/TUTORIAL/9SEATPOW.TUT", "start": 58226713, "end": 58910327}, {"filename": "/data/TUTORIAL/LOYALTY.TUT", "start": 58910327, "end": 59522609}, {"filename": "/data/TUTORIAL/SPYING.TUT", "start": 59522609, "end": 60142208}, {"filename": "/data/TUTORIAL/config.txt", "start": 60142208, "end": 60142466}], "remote_package_size": 60142466});

  })();
