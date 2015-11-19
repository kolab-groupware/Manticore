'use strict';

angular.module('manticoreApp')
.controller('SaveButtonCtrl', function ($scope, $timeout) {
    $scope.label = 'Save';
    $scope.isSaving = false;
    $scope.isModified = false;

    /**
     * @param {Function=} cb Optional callback that provides success value (true/false)
     */
    $scope.save = function (cb) {
        $scope.label = 'Saving';
        $scope.isSaving = true;

        var socket = $scope.editor.clientAdaptor.getSocket();
        socket.emit('save', function (err) {
            $timeout(function () {
                if (err) {
                    $scope.label = 'Error while saving';
                    if (cb) { cb(false); }
                } else {
                    $scope.label = 'Saved just now';
                    $scope.isModified = false;
                    if (cb) { cb(true); }
                }
            });

            $timeout(function () {
                $scope.label = 'Save';
                $scope.isSaving = false;
            }, 1000);
        });
    };

    function iframeActionSave(event) {
      $scope.save(function (successful) {
        event.source.postMessage({
          id: event.data.id,
          successful: successful
        }, event.origin);
      });
    }

    function handleDocumentChanged() {
      $timeout(function () {
        $scope.isModified = true;
        $scope.editor.broadcastIframeEvent({ name: 'documentChanged' });
      });
    }

    $scope.$watch('joined', function (online) {
        if (online === undefined) { return; }
        if (online) {
            $scope.editor.addIframeEventListener('actionSave', iframeActionSave);
            $scope.operationRouter.subscribe('documentChanged', handleDocumentChanged);
        } else {
            $scope.editor.removeIframeEventListener('actionSave', iframeActionSave);
            $scope.operationRouter.unsubscribe('documentChanged', handleDocumentChanged);
        }
    });
});
