'use strict';

/*global Wodo*/

angular.module('manticoreApp')
.controller('TitleEditorCtrl', function ($scope, $timeout) {
    function handleTitleChanged(changes) {
        var title = changes.setProperties['dc:title'];
        if (title !== undefined && title !== $scope.title) {
            $timeout(function () {
                $scope.title = title;
                $scope.editor.broadcastIframeEvent({
                  name: 'titleChanged',
                  value: title
                });
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

    function iframeGetTitle(event) {
      event.source.postMessage({
        id: event.data.id,
        value: $scope.title
      }, event.origin);
    }

    function iframeSetTitle(event) {
      $scope.title = event.data.value;
      $scope.changeTitle();
      $timeout(function () {
        event.source.postMessage({
          id: event.data.id,
          successful: true
        }, event.origin);
      });
    }

    $scope.$watch('joined', function (online) {
        if (online === undefined) { return; }
        if (online) {
            $scope.editor.addEventListener(Wodo.EVENT_METADATACHANGED, handleTitleChanged);
            $scope.editor.addIframeEventListener('getTitle', iframeGetTitle);
            $scope.editor.addIframeEventListener('setTitle', iframeSetTitle);
        } else {
            $scope.editor.removeEventListener(Wodo.EVENT_METADATACHANGED, handleTitleChanged);
            $scope.editor.removeIframeEventListener('getTitle', iframeGetTitle);
            $scope.editor.removeIframeEventListener('setTitle', iframeSetTitle);

        }
    });

    function init() {
        $scope.title = $scope.document.title;
    }

    init();
});
