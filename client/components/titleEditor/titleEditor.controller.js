'use strict';

/*global Wodo*/

angular.module('manticoreApp')
.controller('TitleEditorCtrl', function ($scope, $timeout) {
    function handleTitleChanged(changes) {
        var title = changes.setProperties['dc:title'];
        if (title !== undefined && title !== $scope.title) {
            $timeout(function () {
                $scope.title = title;
            });
        }
    }

    $scope.changeTitle = function () {
        if ($scope.title !== $scope.editor.getMetadata('dc:title')) {
            $scope.editor.setMetadata({
                'dc:title': $scope.title
            });
        }
    };

    $scope.handleEnterKey = function ($event) {
        if ($event.keyCode === 13) {
            $event.target.blur();
        }
    };

    $scope.$watch('joined', function (online) {
        if (online === undefined) { return; }
        if (online) {
            $scope.editor.addEventListener(Wodo.EVENT_METADATACHANGED, handleTitleChanged);
        } else {
            $scope.editor.removeEventListener(Wodo.EVENT_METADATACHANGED, handleTitleChanged);
        }
    });

    function init() {
        $scope.title = $scope.document.title;
    }

    init();
});
