'use strict';

angular.module('hyphe.exportController', [])

  .controller('export', ['$scope', 'api', 'utils', 'corpus'
  ,function($scope, api, utils, corpus) {
    $scope.currentPage = 'export'
    $scope.Page.setTitle('Export')
    $scope.corpusName = corpus.getName()
    $scope.corpusId = corpus.getId()
    $scope.backed_up = false

    var queryBatchSize = 1000

    $scope.projectName = $scope.corpusName

    $scope.list

    $scope.statuses = {in:true, out:false, undecided:false, discovered:false}
    $scope.counts = {}
    $scope.columns = {
      id: {
        name: 'ID'
        ,accessor: 'id'
        ,type: 'string'
        ,val: true
      }
      ,name: {
        name: 'NAME'
        ,accessor: 'name'
        ,type: 'string'
        ,val: true
      }
      ,prefixes: {
        name: 'PREFIXES'
        ,accessor: 'lru_prefixes'
        ,type: 'array of lru'
        ,val: true
      }
      ,prefixes_lru: {
        name: 'PREFIXES AS LRU'
        ,accessor: 'lru_prefixes'
        ,type: 'array of string'
        ,val: false
      }
      ,start_pages: {
        name: 'START PAGES'
        ,accessor: 'startpages'
        ,type: 'array of string'
        ,val: false
      }
      ,status: {
        name: 'STATUS'
        ,accessor: 'status'
        ,type: 'string'
        ,val: true
      }
      ,indegree: {
        name: 'INDEGREE'
        ,accessor: 'indegree'
        ,type: 'string'
        ,val: true
      }
      ,crawling_status: {
        name: 'CRAWLING STATUS'
        ,accessor: 'crawling_status'
        ,type: 'string'
        ,val: true
      }
      ,indexing_status: {
        name: 'INDEXING STATUS'
        ,accessor: 'indexing_status'
        ,type: 'string'
        ,val: false
      }
      ,creation_date: {
        name: 'CREATION DATE'
        ,accessor: 'creation_date'
        ,type: 'date'
        ,val: false
      }
      ,last_modification_date: {
        name: 'LAST MODIFICATION DATE'
        ,accessor: 'last_modification_date'
        ,type: 'date'
        ,val: true
      }
      ,creation_date_timestamp: {
        name: 'CREATION DATE AS TIMESTAMP'
        ,accessor: 'creation_date'
        ,type: 'string'
        ,val: false
      }
      ,last_modification_date_timestamp: {
        name: 'LAST MODIFICATION DATE AS TIMESTAMP'
        ,accessor: 'last_modification_date'
        ,type: 'string'
        ,val: false
      }
      ,user_tags: {
        name: 'TAGS'
        ,accessor: 'tags.USER'
        ,type: 'json'
        ,val: false
      }
      ,core_tags: {
        name: 'TECHNICAL INFO'
        ,accessor: 'tags.CORE'
        ,type: 'json'
        ,val: false
      }
    }
    $scope.presets = [
      {
        name:'basic corpus'
      , statuses: {
          in: true
        , undecided: false
        , out: false
        , discovered: false
        }
      , columns: {
          id: true
        , name: true
        , prefixes: true
        , prefixes_lru: false
        , start_pages: false
        , status: true
        , indegree: true
        , crawling_status: true
        , indexing_status: false
        , creation_date: false
        , last_modification_date: true
        , creation_date_timestamp: false
        , last_modification_date_timestamp: false
        , user_tags: false
        , core_tags: false
        }
      }
    , {
        name:'full data'
      , statuses: {
          in: true
        , undecided: true
        , out: true
        , discovered: true
        }
      , columns: {
          id: true
        , name: true
        , prefixes: false
        , prefixes_lru: true
        , start_pages: true
        , status: true
        , indegree: true
        , crawling_status: true
        , indexing_status: true
        , creation_date: false
        , last_modification_date: false
        , creation_date_timestamp: true
        , last_modification_date_timestamp: true
        , user_tags: true
        , core_tags: true
        }
      }
    , {
        name:'check all'
      , statuses: {
          in: true
        , undecided: true
        , out: true
        , discovered: true
        }
            , columns: {
          id: true
        , name: true
        , prefixes: true
        , prefixes_lru: true
        , start_pages: true
        , status: true
        , indegree: true
        , crawling_status: true
        , indexing_status: true
        , creation_date: true
        , last_modification_date: true
        , creation_date_timestamp: true
        , last_modification_date_timestamp: true
        , user_tags: true
        , core_tags: true
        }
      }
    , {
        name:'uncheck all'
      , statuses: {
          in: false
        , undecided: false
        , out: false
        , discovered: false
        }
            , columns: {
          id: false
        , name: false
        , prefixes: false
        , prefixes_lru: false
        , start_pages: false
        , status: false
        , indegree: false
        , crawling_status: false
        , indexing_status: false
        , creation_date: false
        , last_modification_date: false
        , creation_date_timestamp: false
        , last_modification_date_timestamp: false
        , user_tags: false
        , core_tags: false
        }
      }

    ]
    $scope.fileFormat = 'CSV'

    $scope.working = false
    $scope.statusPending = []
    $scope.resultsList = []

    $scope.download = function(){
      $scope.working = true
      $scope.resultsList = []
      $scope.queriesToDo = {'in':{total:undefined,stack:[]}, 'out':{total:undefined,stack:[]}, 'undecided':{total:undefined,stack:[]}, 'discovered':{total:undefined,stack:[]}}
      
      if($scope.statuses.in){
        $scope.queriesToDo.in.stack.push(0)
      } else {
        $scope.queriesToDo.in.total = 0
      }
      if($scope.statuses.out){
        $scope.queriesToDo.out.stack.push(0)
      } else {
        $scope.queriesToDo.out.total = 0
      }
      if($scope.statuses.undecided){
        $scope.queriesToDo.undecided.stack.push(0)
      } else {
        $scope.queriesToDo.undecided.total = 0
      }
      if($scope.statuses.discovered){
        $scope.queriesToDo.discovered.stack.push(0)
      } else {
        $scope.queriesToDo.discovered.total = 0
      }

      loadWebentities()
    }

    $scope.applyPreset = function(p){
      for(var k in $scope.statuses){
        $scope.statuses[k] = $scope.presets[p].statuses[k]
      }
      for(var c in $scope.columns){
        $scope.columns[c].val = $scope.presets[p].columns[c]
      }
    }

    // Init
    loadStatus()

    // Functions
    function loadStatus(){
      api.globalStatus({}, function(status){
        $scope.counts = {
          in: status.corpus.memory_structure.webentities.IN
        , undecided: status.corpus.memory_structure.webentities.UNDECIDED
        , out: status.corpus.memory_structure.webentities.OUT
        , discovered: status.corpus.memory_structure.webentities.DISCOVERED
        }
      },function(data, status, headers, config){
        $scope.status = {message: 'Error loading status', background:'danger'}
      })
    }

    function loadWebentities(){
      if($scope.queriesToDo.in.stack.length + $scope.queriesToDo.out.stack.length + $scope.queriesToDo.undecided.stack.length + $scope.queriesToDo.discovered.stack.length>0){
        
        var totalQueries = 0  // We do an estimation when we don't know
        totalQueries += $scope.queriesToDo.in.total || 10
        totalQueries += $scope.queriesToDo.out.total || 10
        totalQueries += $scope.queriesToDo.undecided.total || 10
        totalQueries += $scope.queriesToDo.discovered.total || 100
        
        var doneQueries = 0
        if($scope.queriesToDo.in.stack.length > 0)
          doneQueries += $scope.queriesToDo.in.stack[0]
        if($scope.queriesToDo.out.stack.length > 0)
          doneQueries += $scope.queriesToDo.out.stack[0]
        if($scope.queriesToDo.undecided.stack.length > 0)
          doneQueries += $scope.queriesToDo.undecided.stack[0]
        if($scope.queriesToDo.discovered.stack.length > 0)
          doneQueries += $scope.queriesToDo.discovered.stack[0]
        
        var percent = Math.floor(100 * doneQueries / totalQueries)
        ,msg = percent + '% loaded'
        $scope.status = {message: msg, progress:percent}

        /*console.log(percent + '%' + '\nSummary: ' + doneQueries + ' / ' + totalQueries
          + '\nIN:', $scope.queriesToDo.in.stack.join(' ') + ' / ' + $scope.queriesToDo.in.total
          + '\nOUT:', $scope.queriesToDo.out.stack.join(' ') + ' / ' + $scope.queriesToDo.out.total
          + '\nUNDECIDED:', $scope.queriesToDo.undecided.stack.join(' ') + ' / ' + $scope.queriesToDo.undecided.total
          + '\nDISCOVERED:', $scope.queriesToDo.discovered.stack.join(' ') + ' / ' + $scope.queriesToDo.discovered.total
        )*/

        var status
        ,page
        if($scope.queriesToDo.in.stack.length > 0){
          status = 'IN'
          page = $scope.queriesToDo.in.stack.shift()
        } else if($scope.queriesToDo.out.stack.length > 0){
          status = 'OUT'
          page = $scope.queriesToDo.out.stack.shift()
        } else if($scope.queriesToDo.undecided.stack.length > 0){
          status = 'UNDECIDED'
          page = $scope.queriesToDo.undecided.stack.shift()
        } else if($scope.queriesToDo.discovered.stack.length > 0){
          status = 'DISCOVERED'
          page = $scope.queriesToDo.discovered.stack.shift()
        }
        

        api.getWebentities_byStatus({
            status:status
            ,count:queryBatchSize
            ,page:page
          }
          ,function(result){
            
            // update queries totals
            var queriesTotal = 1 + Math.floor(result.total_results/queryBatchSize)
            $scope.queriesToDo[status.toLowerCase()].total = queriesTotal
            $scope.queriesToDo[status.toLowerCase()].stack = []
            for(var p = page+1; p<queriesTotal; p++){
              $scope.queriesToDo[status.toLowerCase()].stack.push(p)
            }

            $scope.resultsList = $scope.resultsList.concat(result.webentities)
            
            loadWebentities()
          }
          ,function(data, status, headers, config){
            $scope.status = {message: 'Loading error', background:'danger'}
          }
        )

      } else {
        // Finalize
        // NB: these setTimeout turn around a buggy interaction between saveAs and recent Firefox
        $scope.status = {message:'Processing...'}
        
        setTimeout(function(){
          var success = finalize()
          if(success){

            setTimeout(function(){
              $scope.working = false
              $scope.status = {message: "File downloaded", background:'success'}          
            }, 10)

          }
          
        }, 10)
      }
    }

    function finalize(){
      console.log('Finalize',$scope.resultsList)

      if(!$scope.backed_up){
        api.backupCorpus({
          id: $scope.corpusId
        }, function(){
          $scope.backed_up = true
        }, function(){})
      }

      if($scope.fileFormat == 'JSON'){
          
        var json = {
          exportTimestamp: +(new Date().getTime())
          ,webentities: $scope.resultsList.map(function(we){
              var result = {}
              for(var colKey in $scope.columns){
                var colObj = $scope.columns[colKey]
                if(colObj.val){
                  var value = we
                  colObj.accessor.split('.').forEach(function(accessor){
                    value = value[accessor]
                  })
                  var tv
                  if(value === undefined){
                    tv = ''
                  } else {
                    tv = translateValue(value, colObj.type, 'JSON')
                  }
                  if(tv === undefined){
                    console.log(value,we,colObj,'could not be transferred')
                  } else {
                    result[colObj.name] = tv
                  }
                }
              }
              return result
            })

        }

        var blob = new Blob([JSON.stringify(json)], {type: "application/json;charset=utf-8"})
        saveAs(blob, $scope.projectName + ".json")

        return true

      } else if($scope.fileFormat == 'TEXT'){
        
        var fileContent = []

        // Title
        fileContent.push($scope.projectName + '\n' + $scope.projectName.replace(/./gi,'=') + '\nExported ' + (new Date()).toLocaleString() + '\n\n' )

        $scope.resultsList.forEach(function(we){
          var content = '\n\n\n\n' + we.name + '\n' + we.name.replace(/./gi, '-')
          for(var colKey in $scope.columns){
            var colObj = $scope.columns[colKey]
            if(colObj.val){

              var value = we
              colObj.accessor.split('.').forEach(function(accessor){
                value = value[accessor]
              })

              var tv
              if(value === undefined){
                tv = ''
              } else {
                tv = translateValue(value, colObj.type, 'MD')
              }
              if(tv === undefined){
                console.log(value,we,colObj,'could not be transferred')
              } else {
                content += '\n\n#### ' + colObj.name + '\n' + tv
              }
            }
          }
          fileContent.push(content)
        })

        var blob = new Blob(fileContent, {type: "text/x-markdown; charset=UTF-8"})
        saveAs(blob, $scope.projectName + " MarkDown.txt")

        return true

      } else if($scope.fileFormat == 'CSV' || $scope.fileFormat == 'SCSV' || $scope.fileFormat == 'TSV'){

        // Build Headline
        var headline = []
        for(var colKey in $scope.columns){
          var colObj = $scope.columns[colKey]
          if(colObj.val){
            headline.push(colObj.name)
          }
        }

        // Build Table Content
        var tableContent = []
        $scope.resultsList.forEach(function(we){
          var row = []

          for(var colKey in $scope.columns){
            var colObj = $scope.columns[colKey]
            if(colObj.val){
              var value = we
              colObj.accessor.split('.').forEach(function(accessor){
                value = value[accessor]
              })
              var tv
              if(value === undefined){
                tv = ''
              } else {
                tv = translateValue(value, colObj.type)
              }
              if(tv === undefined){
                console.log(value,we,colObj,'could not be transferred')
              }
              row.push(tv)
            }
          }

          tableContent.push(row)
        })


        // Parsing
        var fileContent = []
        ,csvElement = function(txt){
          txt = ''+txt //cast
          return '"'+txt.replace(/"/gi, '""')+'"'
        }

        if($scope.fileFormat == 'CSV'){

          fileContent.push(
            headline.map(csvElement).join(',')
          )
          tableContent.forEach(function(row){
            fileContent.push('\n' + row.map(csvElement).join(','))
          })

          var blob = new Blob(fileContent, {'type': "text/csv;charset=utf-8"});
          saveAs(blob, $scope.projectName + ".csv");

        } else if($scope.fileFormat == 'SCSV'){

          fileContent.push(
            headline.map(csvElement).join(';')
          )
          tableContent.forEach(function(row){
            fileContent.push('\n' + row.map(csvElement).join(';'))
          })

          var blob = new Blob(fileContent, {type: "text/csv;charset=utf-8"});
          saveAs(blob, $scope.projectName + " SEMICOLON.csv");

        } else if($scope.fileFormat == 'TSV'){

          fileContent.push(
            headline.map(csvElement).join('\t')
          )
          tableContent.forEach(function(row){
            fileContent.push('\n' + row.map(csvElement).join('\t'))
          })

          var blob = new Blob(fileContent, {type: "text/tsv;charset=utf-8"});
          saveAs(blob, $scope.projectName + ".tsv");

        }

        return true
      }

    }

    function translateValue(value, type, mode){
      
      mode = mode || 'TEXT'

      var array_separator = ' '

      if(type == 'string'){
        return value
      
      } else if(type == 'date'){
        return (new Date(+value*1000)).toLocaleString()
      
      } else if(type == 'array of string'){

        if(value instanceof Array){
          if(mode == 'JSON'){
            return value
          } else if(mode == 'MD'){
            return value
              .map(function(d){
                return '* ' + d
              })
              .join('\n')
          } else {
            return value.sort()
              .join(array_separator)
          }
        } else {
          console.log(value,'is not an array')
        }

      } else if(type == 'array of lru'){

        if(value instanceof Array){
          if(mode == 'JSON'){
            return value
              .map(utils.LRU_to_URL)
          } else if(mode == 'MD'){
            return value
              .map(utils.LRU_to_URL)
              .map(function(d){
                return '* ' + d
              })
              .join('\n')
          } else {
            return value.sort()
              .map(utils.LRU_to_URL)
              .join(array_separator)
          }
        } else {
          console.log(value,'is not an array')
        }

      } else if(type == 'json'){

        if(mode == 'JSON'){
          return value
        } else if(mode == 'MD'){
          return '```sh\n' + JSON.stringify(value) + '\n```'
        } else {
          return JSON.stringify(value)
        }

      }
    }
  }])
