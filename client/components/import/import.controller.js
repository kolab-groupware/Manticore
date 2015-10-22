'use strict';

angular.module('manticoreApp')
    .controller('ImportCtrl', function ($scope, $rootScope, FileUploader, Auth) {
        var uploader = new FileUploader({
            url: '/api/documents/',
            headers: {
                'Authorization': 'Bearer ' + Auth.getToken()
            },
            removeAfterUpload: false,
            autoUpload: true,
            onCompleteAll: function () {
                // Wait a little before firing this event, as the upload may not
                // be accessible from MongoDB immediately
                window.setTimeout(function () {
                    $rootScope.$broadcast('documentsUploaded');
                    uploader.clearQueue();
                }, 1000);
            }
        });

        uploader.filters.push({
            name: 'sizeFilter',
            fn: function (item) {
                return item.size <= 10485760; // 10 Megabytes
            }
        });
        uploader.filters.push({
            name: 'typeFilter',
            fn: function (item) {
                return item.type === 'application/vnd.oasis.opendocument.text';
            }
        });

        $scope.uploader = uploader;
    });
