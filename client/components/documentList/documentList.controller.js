'use strict';

angular.module('manticoreApp')
.controller('DocumentListCtrl', function ($scope, $http) {
    $scope.displayedDocuments = [];

    function update() {
        console.log('here');
        $http.get('/api/documents').success(function (documents) {
            $scope.documents = documents;
        });
    }

    $scope.$on('documentsUploaded', update);
    update();
});
