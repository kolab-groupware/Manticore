'use strict';

angular.module('manticoreApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('editor', {
        url: '/document/:id',
        reload: true,
        resolve: {
            socketio: function (angularLoad) {
                return angularLoad.loadScript('socket.io/socket.io.js');
            },
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
