angular.module('Sequencer').controller('TrackCtrl', function($scope, $http, $timeout) {
    $scope.create = function(){
        $scope.project.tracks.push({clips: [{events: [], length: 8}], port: 0});
    };
});