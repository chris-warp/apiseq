angular.module('Sequencer', [])
    .controller('MainCtrl', function ($scope) {
        $scope.Math             = window.Math;
        $scope.project          = null;
        $scope.selectedClip     = null;
        $scope.playheadPosition = null;
        $scope.isPlaying        = false;

        window.onkeydown = function(){
            if (event.keyCode === 32){
                if ($scope.isPlaying){
                    $scope.stop();
                }
                else {
                    $scope.play();
                }
            }
        };

        $scope.play = function(){
            if ($scope.isPlaying){
                return;
            }
            $scope.send('play');
            $scope.isPlaying = true;
        };

        $scope.stop = function(){
            $scope.send('stop');
            $scope.isPlaying = false;
        };

        $scope.selectClip = function(){
            $scope.selectedClip = this.clip;
        };
        $scope.send = function (action, content) {
            THRUST.remote.send({action: action, content: content});
        };
        THRUST.remote.listen(function(msg) {
            switch (msg.action){
                case 'projectLoaded':
                    $scope.project = msg.message;
                    $scope.$apply();
                    break;
                case 'playheadPositionUpdated':
                    $scope.playheadPosition = msg.message;
                    $scope.$apply();
                    break;
            }
        });
        $scope.send('load');
    }
).filter('range', function () {
        return function (input, total) {
            total = parseInt(total);
            for (var i = 0; i < total; i++) {
                input.push(i);
            }
            return input;
        }
    }).filter('reverse', function () {
        return function (items) {
            return items.slice().reverse();
        };
    });