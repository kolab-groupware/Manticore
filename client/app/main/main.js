'use strict';

angular.module('manticoreApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('manticore', {
          url: '',
          abstract: true,
          resolve: {
            config: function ($http) {
              return $http.get('/config');
            }
          },
          template: '<ui-view/>',
          controller: function ($rootScope, config) {
              $rootScope.config = config.data;
          }
      })
      .state('manticore.main', {
        url: '/',
        templateUrl: 'app/main/main.html',
        controller: 'MainCtrl'
      });
  });
