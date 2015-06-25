'use strict';

angular.module('manticoreApp')
    .controller('ImportCtrl', function ($scope, FileUploader) {
        var uploader = new FileUploader({
            url: '/import',
            removeAfterUpload: true,
            autoUpload: true
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