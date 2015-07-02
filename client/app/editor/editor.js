'use strict';

angular.module('manticoreApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('editor', {
        url: '/document/:id',
        reload: true,
        resolve: {
            document: function ($stateParams, $http) {
                return $http.get('/api/documents/' + $stateParams.id)
                .then(function(response) {
                    return response.data;
                });
            }
        },
        templateUrl: 'app/editor/editor.html',
        controller: function ($scope, document) {
            $scope.document = document;
        }
      });
  });
