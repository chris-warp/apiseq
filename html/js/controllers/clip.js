angular.module('Sequencer').controller('ClipCtrl', function($scope, $http, $timeout) {
    $scope.zoomX = 1;
    $scope.zoomY = 1;

    function refresh(){
        // midi helper constants
        var notes = ['C', 'C#', 'D', 'Eb', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
        var semi = [1, 3, 6, 8, 10];

        // init canvas objects
        var canvas = $('canvas.roll')[0];
        var context = canvas.getContext('2d');
        var clip = $scope.selectedClip;

        if (!clip){
            return;
        }

        var events = clip.events;
        var cell = {
            width: 50 * $scope.zoomX,
            height: 20 * $scope.zoomY
        };

        // set canvas dimensions
        canvas.width = clip.length * cell.width;
        canvas.height = 128*cell.height;

        // draw piano roll
        for (var row = 0; row<127; row++){
            context.fillStyle = '#fff';
            context.font = 'normal 10px Maven Pro';
            context.fillText(notes[(row)%notes.length], 0, ((127-row)*cell.height)+12);
            for (var col = 0; col<clip.length; col++){
                var isColActive = col===($scope.playheadPosition%clip.length);
                context.beginPath();
                context.rect((col+1)*cell.width, (127-row)*cell.height, cell.width-1, cell.height-1);
                context.fillStyle = _.contains(semi, row%12)?isColActive?'#bbb':'#ccc':isColActive?'#ddd':'#fff';
                context.fill();
            }
        }

        _.each(events, function(items, col){
            var isColActive = col===($scope.playheadPosition%clip.length);
            _.each(items, function(event){
                context.beginPath();
                context.rect((col+1)*cell.width, (127-event[1])*cell.height, cell.width-1, cell.height-1);
                context.fillStyle = isColActive?'#3f3':'#f33';
                context.fill();
            });
        });
    }

    $scope.$watch('selectedClip', refresh);
    $scope.$watch('zoomX', refresh);
    $scope.$watch('zoomY', refresh);
    $scope.$watch('playheadPosition', refresh);
});