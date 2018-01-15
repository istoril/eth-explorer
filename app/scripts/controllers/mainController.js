//var cryptoSocket = require('crypto-socket');
var BigNumber = require('bignumber.js');
angular.module('ethExplorer')
    .controller('mainCtrl', function($rootScope, $scope, $location) {

        // Display & update block list
        getETHRates();
        updateBlockList();
        updateTXList();
        updateStats();
        getHashrate();

        web3.eth.filter("latest", function(error, result) {
            if (!error) {
                getETHRates();
                updateBlockList();
                updateTXList();
                updateStats();
                getHashrate();
                $scope.$apply();
            }
        });

        $scope.processRequest = function() {
            var requestStr = $scope.ethRequest;


            if (requestStr !== undefined) {

                // maybe we can create a service to do the reg ex test, so we can use it in every controller ?

                var regexpTx = /[0-9a-zA-Z]{64}?/;
                //var regexpAddr =  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}/; // TODO ADDR REGEX or use isAddress(hexString) API ?
                var regexpAddr = /^(0x)?[0-9a-f]{40}$/; //New ETH Regular Expression for Addresses
                var regexpBlock = /[0-9]{1,7}?/;

                var result = regexpTx.test(requestStr);
                if (result === true) {
                    goToTxInfos(requestStr)
                } else {
                    result = regexpAddr.test(requestStr.toLowerCase());
                    if (result === true) {
                        goToAddrInfos(requestStr.toLowerCase())
                    } else {
                        result = regexpBlock.test(requestStr);
                        if (result === true) {
                            goToBlockInfos(requestStr)
                        } else {
                            console.log("nope");
                            return null;
                        }
                    }
                }
            } else {
                return null;
            }
        };


        function goToBlockInfos(requestStr) {
            $location.path('/block/' + requestStr);
        }

        function goToAddrInfos(requestStr) {
            $location.path('/address/' + requestStr.toLowerCase());
        }

        function goToTxInfos(requestStr) {
            $location.path('/tx/' + requestStr);
        }

        function updateStats() {
            $scope.blockNum = web3.eth.blockNumber; // now that was easy

            if ($scope.blockNum !== undefined && $scope.blockNum >= 1) {
                const block1 = web3.eth.getBlock(1);
                // TODO: put the 2 web3.eth.getBlock into the async function below
                //       easiest to first do with fastInfosCtrl
                var blockNewest = web3.eth.getBlock($scope.blockNum);

                if (blockNewest !== undefined) {

                    // difficulty
                    $scope.difficulty = blockNewest.difficulty;
                    $scope.difficultyToExponential = blockNewest.difficulty.toExponential(3);

                    $scope.totalDifficulty = blockNewest.totalDifficulty;
                    $scope.totalDifficultyToExponential = blockNewest.totalDifficulty.toExponential(3);

                    $scope.totalDifficultyDividedByDifficulty = $scope.totalDifficulty.dividedBy($scope.difficulty);
                    $scope.totalDifficultyDividedByDifficulty_formatted = $scope.totalDifficultyDividedByDifficulty.toFormat(1);

                    $scope.AltsheetsCoefficient = $scope.totalDifficultyDividedByDifficulty.dividedBy($scope.blockNum);
                    $scope.AltsheetsCoefficient_formatted = $scope.AltsheetsCoefficient.toFormat(4);

                    // large numbers still printed nicely:
                    $scope.difficulty_formatted = $scope.difficulty.toFormat(0);
                    $scope.totalDifficulty_formatted = $scope.totalDifficulty.toFormat(0);

                    // Gas Limit
                    $scope.gasLimit = blockNewest.gasLimit;

                    // Time
                    $scope.time = blockNewest.timestamp;

                    $scope.secondsSinceBlock1 = blockNewest.timestamp - block1.timestamp;
                    $scope.daysSinceBlock1 = ($scope.secondsSinceBlock1 / 86400).toFixed(2);

                    // Average Block Times:
                    // TODO: make fully async, put below into 'fastInfosCtrl'

                    var blockBefore = web3.eth.getBlock($scope.blockNum - 1);
                    if (blockBefore !== undefined) {
                        $scope.blocktime = blockNewest.timestamp - blockBefore.timestamp;
                    }
                    $scope.range1 = 100;
                    range = $scope.range1;
                    var blockPast = web3.eth.getBlock(Math.max($scope.blockNum - range, 1));
                    if (blockBefore !== undefined) {
                        $scope.blocktimeAverage1 = ((blockNewest.timestamp - blockPast.timestamp) / range).toFixed(2);
                    }
                    $scope.range2 = 1000;
                    range = $scope.range2;
                    var blockPast = web3.eth.getBlock(Math.max($scope.blockNum - range, 1));
                    if (blockBefore !== undefined) {
                        $scope.blocktimeAverage2 = ((blockNewest.timestamp - blockPast.timestamp) / range).toFixed(2);
                    }
                    $scope.range3 = 10000;
                    range = $scope.range3;
                    var blockPast = web3.eth.getBlock(Math.max($scope.blockNum - range, 1));
                    if (blockBefore !== undefined) {
                        $scope.blocktimeAverage3 = ((blockNewest.timestamp - blockPast.timestamp) / range).toFixed(2);
                    }
                    $scope.range4 = 100000;
                    range = $scope.range4;
                    var blockPast = web3.eth.getBlock(Math.max($scope.blockNum - range, 1));
                    if (blockBefore !== undefined) {
                        $scope.blocktimeAverage4 = ((blockNewest.timestamp - blockPast.timestamp) / range).toFixed(2);
                    }

                    range = $scope.blockNum;
                    if (blockBefore !== undefined) {
                        $scope.blocktimeAverageAll = ((blockNewest.timestamp - block1.timestamp) / range).toFixed(2);
                    }

                    //fastAnswers($scope);
                    //$scope=BlockExplorerConstants($scope);

                }
            }
            // Block Explorer Info
            $scope.isConnected = web3.isConnected();
            //$scope.peerCount = web3.net.peerCount;
            $scope.versionApi = web3.version.api;
            $scope.versionClient = web3.version.client;
            //$scope.versionNetwork = web3.version.network;
            $scope.versionCurrency = web3.version.ethereum; // TODO: change that to currencyname?

            // ready for the future:
            try {
                $scope.versionWhisper = web3.version.whisper;
            } catch (err) {
                $scope.versionWhisper = err.message;
            }
        }

        /* Formula taken from this repo. Estimates the actual network
         * hash-rate 
         * https://github.com/badmofo/ethereum-mining-calculator/tree/90f4e5aae595a6877f1a26b43c15a7db35149a22
         */
        function getHashrate() {
            if ($scope.blockNum !== undefined && $scope.blockNum >= 0) {
                const blockNewest = web3.eth.getBlock($scope.blockNum);
                const blockBefore = web3.eth.getBlock($scope.blockNum - 1);
                const blockTime = blockNewest.timestamp - blockBefore.timestamp;
                $scope.hashrate = (blockNewest.difficulty / blockTime);
            }
        }

        function getETHRates() {
            $.getJSON("https://api.coinmarketcap.com/v1/ticker/ethereum/", function(json) {
                var price = Number(json[0].price_usd);
                $scope.ethprice = "$" + price.toFixed(2);
            });

            $.getJSON("https://api.coinmarketcap.com/v1/ticker/ethereum/", function(json) {
                var btcprice = Number(json[0].price_btc);
                $scope.ethbtcprice = btcprice;
            });

            $.getJSON("https://api.coinmarketcap.com/v1/ticker/ethereum/", function(json) {
                var cap = Number(json[0].market_cap_usd);
                //console.log("Current ETH Market Cap: " + cap);
                $scope.ethmarketcap = cap;
            });
        }

        function updateTXList() {
            var currentTXnumber = web3.eth.blockNumber;
            $scope.txNumber = currentTXnumber;
            $scope.recenttransactions = [];
            for (var i = 0; i < 10 && currentTXnumber - i >= 0; i++) {
                $scope.recenttransactions.push(web3.eth.getTransactionFromBlock(currentTXnumber - i));
            }
        }

        function updateBlockList() {
            var currentBlockNumber = web3.eth.blockNumber;
            $scope.blockNumber = currentBlockNumber;
            $scope.blocks = [];
            for (var i = 0; i < 10 && currentBlockNumber - i >= 0; i++) {
                $scope.blocks.push(web3.eth.getBlock(currentBlockNumber - i));
            }
        }

    });


/*
 * This function takes an array that contains objects of type
 * FORMAT {val: <number>, id: <string>, digit: <number>}, 
 * the value to represent (e.g. difficulty, block size, etc.) 
 * and returns the value with the better suited scale and format string.
 */
function transformer(FORMAT, value) {

    for (let i = 0; i < FORMAT.length; i++) {
        format = FORMAT[i];
        if (value > format.val) {
            var n = value / format.val;
            return n.toFixed(format.digit) + " " + format.id;
        }
    }
    return 0 + " " + FORMAT[FORMAT.length-1].id;
}

angular.module('filters', []).
filter('truncate', function() {
    return function(text, length, end) {
        if (isNaN(length))
            length = 10;

        if (end === undefined)
            end = "...";

        if (text.length <= length || text.length - end.length <= length) {
            return text;
        } else {
            return String(text).substring(0, length - end.length) + end;
        }
    };
}).
filter('diffFormat', function() {
    return function(diffi) {
        if (isNaN(diffi)) return diffi;
        const FORMAT = [
            {val: 1000000000000000, id: "P", digit: 3},
            {val: 1000000000000, id: "T", digit: 3},
            {val: 1000000000, id: "G", digit: 3},
            {val: 1000000, id: "M", digit: 3},
            {val: 1000, id: "K", digit: 3},
            {val: 1, id: " ", digit: 0},
        ];
        return transformer(FORMAT, diffi);
    };
}).
filter('stylize', function() {
    return function(style) {
        if (isNaN(style)) return style;
        var si = '<span class="btn btn-primary">' + style + '</span>';
        return si;
    };
}).
filter('stylize2', function() {
    return function(text) {
        if (isNaN(text)) return text;
        var si = '<i class="fa fa-exchange"></i> ' + text;
        return si;
    };
}).
filter('hashFormat', function() {
    return function(hashr) {
        if (isNaN(hashr)) return hashr;
        var n = hashr / 1000000000000;
        const FORMAT = [
            {val: 1000000000000000, id: "PH/s", digit: 3},
            {val: 1000000000000, id: "TH/s", digit: 3},
            {val: 1000000000, id: "GH/s", digit: 3},
            {val: 1000000, id: "MH/s", digit: 3},
            {val: 1000, id: "KH/s", digit: 3},
            {val: 1, id: "H/s", digit: 0},
        ];
        return transformer(FORMAT, hashr);
    };
}).
filter('gasFormat', function() {
    return function(txt) {
        if (isNaN(txt)) return txt;
        var b = new BigNumber(txt);
        return b.toFormat(0) + " m/s";
    };
}).
filter('BigNum', function() {
    return function(txt) {
        if (isNaN(txt)) return txt;
        var b = new BigNumber(txt);
        var w = web3.fromWei(b, "ether");
        return w.toFixed(6) + " ETH";
    };
}).
filter('sizeFormat', function() {
    return function(size) {
        if (isNaN(size)) return size;
        const FORMAT = [
            {val: 1024, id: "kB", digit: 3},
            {val: 1, id: "B", digit: 0},
        ];
        return transformer(FORMAT, size);
    };
}).
filter('timestampFormat', function() {
    return function(timestamp) {
        if (isNaN(timestamp)) return timestamp;
        var newDate = new Date();
        newDate.setTime(timestamp * 1000);
        return newDate.toUTCString();
    
    };
}).
filter('percentage', function() {
    return function(num) {
        if (isNaN(num)) return num;
        
        return "" + (num*100).toFixed(4);
    
    };
}).
filter('timeElapsedFilter', function() {
    return function(timeElapsed) { //expressed in seconds
        if (isNaN(timeElapsed)) return timeElapsed;
        const FORMAT = [
            {val: 31536000, id: "years ago", digit: 0},
            {val: 604800, id: "weeks ago", digit: 0},
            {val: 86400, id: "days ago", digit: 0},
            {val: 3600, id: "hours ago", digit: 0},
            {val: 60, id: "minutes ago", digit: 0},
            {val: 1, id: "seconds ago", digit: 0},
        ];
        return transformer(FORMAT, timeElapsed);
    };
});
