'use strict';

angular.module('manticoreApp')
.controller('SaveButtonCtrl', function ($scope, $timeout) {
    $scope.label = 'Save';
    $scope.isSaving = false;

    $scope.save = function () {
        $scope.label = 'Saving';
        $scope.isSaving = true;

        var socket = $scope.editor.clientAdaptor.getSocket();
        socket.emit('save', function (err) {
            $timeout(function () {
                if (err) {
                    $scope.label = 'Error while saving';
                } else {
                    $scope.label = 'Saved just now';
                }
            });

            $timeout(function () {
                $scope.label = 'Save';
                $scope.isSaving = false;
            }, 5000);
        });
    };
});
