'use strict';

angular.module('manticoreApp')
.controller('CreateMenuCtrl', function ($scope, $http) {
    function refresh() {
        $http.get('/api/templates').success(function (templates) {
            $scope.templates = templates;
        });
    }
    refresh();
});
