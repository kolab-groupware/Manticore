'use strict';

angular.module('manticoreApp')
.controller('DocumentListCtrl', function ($scope, $http) {
    $scope.displayedDocuments = [];
    $http.get('/api/documents').success(function (documents) {
        $scope.documents = documents;
    });
});
