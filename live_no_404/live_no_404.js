axios = require('axios');
let fs = require('fs');
const { start } = require('repl');

//const base_url = 'https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,640x360_1000,950x540_1500,.f4v.csmil/master.m3u8';
//const base_url = 'https://cph-msl.akamaized.net/hls/live/2000341/test/master.m3u8';  //akamai live
const base_url = 'http://192.168.0.124:1935/live/nana/playlist.m3u8';   //live   
//const base_url = 'http://192.168.0.124:1935/vod/mp4:sample.mp4/playlist.m3u8';   //vod
//const base_url = 'http://10.0.4.101:8080/B120156699_EPI0001_02_t33.mp4/playlist.m3u8'; //solproxy 

let buffer=[];
let ts_duration = 10000;
let load=3;
let d=ts_duration/1000;

let n = new Array(load);    //for request_ts_vod_fast
n.fill(0);

//host setting 
axios.defaults.headers.common['host'] = 'origin.media.com';

let parser_url = (url,buffer,i) =>
{
   url = url.split('/');  //string to array
   url.pop();
   if( typeof(buffer) == 'object' )
   {
    buffer = buffer[i].split('/');
   }
   else if ( typeof(buffer) == 'string' )
   {
      buffer = buffer.split('/');
   }
   else
   {
      console.log(" ERROR parser_url");
      //return;
   }
   
   url = duplication_eliminater(url,buffer);

   let url_string='';
   for ( let j=0;j<url.length;j++)
   {
        url_string += url[j];
            if(j != url.length-1)
            {
                url_string +='/';
            }
   }
  return url_string;
}


let request_first_m3u8 = (url) =>
{
  axios.get(url
  //   , {    headers: {
  //   'host': 'value'
  //   }
  // }
  )
  .then( (response) => 
  {
        logger(response.status + " " + response.config.url);
        console.log( response.status + " " + response.config.url);
        buffer = response.data.split("\n");
        parser_m3u8(buffer, url);
  
  })
  .catch( (error) => {
      logger(error);
    console.log(error);
  });
}

let buffer_cleaner = (buffer) =>
{
    let cleaned_buffer=[];
    for(let i=0;i<buffer.length;i++)
    {
        if(buffer[i].slice(-2)=='ts')
        {
            cleaned_buffer.push(buffer[i]);
        }
    }
    return cleaned_buffer;
}


let request_second_m3u8 = (url) =>
{
  axios.get(url)
  .then( (response) => 
  {
        logger(response.status + " " + response.config.url);
        console.log( response.status + " " + response.config.url);
        buffer = response.data.split("\n");
        if( buffer[ buffer.length-2 ] == '#EXT-X-ENDLIST')
       {
           buffer = buffer_cleaner(buffer);

            for(let i=0;i<buffer.length;i++)
            {
              buffer[i] = parser_url(url,buffer,i);
            }
           //startInterval(branch_every_second, request_ts_vod, 1000, 'immediate');
            //branch_all_together(request_ts_vod);
            branch_ramdomly(request_ts_vod);
       }
       else
       {
        buffer = buffer[buffer.length-2];  //array -> string
        buffer = parser_url(url,buffer,0);

            startInterval(request_live_m3u8, url, ts_duration);
           // startInterval(brabranch_every_second, request_ts_live, 1000, 'immediate');
           // branch_all_together(request_ts_live);
          branch_ramdomly(request_ts_live);
       }
  })
  .catch( (error) => {
      logger(error);
    console.log(error);
  });
}

let branch_all_together = (callback) =>
{
  for (let id=0;id<load;id++)
  {
    startInterval(callback, id , ts_duration, 'immediate');
  }
}

let branch_ramdomly = (callback) =>
{
  for (let id=0; id<load; id++)
  {
      let r = Math.random();
      r*=ts_duration;
      setTimeout
      (
          () => 
          {
              startInterval(callback, id ,ts_duration,'immediate' );
          } , 
          r
      );
  }
}
let s=0;

let branch_every_second = (callback, stop) =>
{
  for (let id = (load/d) * s; id< (load/d) * (s+1); id++)
  {
    startInterval(callback, id , ts_duration, 'immediate');
  }
  s++;
  if (s==d)
  {
      clearInterval(stop);
  }
}


let parser_m3u8 = (buffer, url) => 
{
    for (let i=0;i<buffer.length;i++)
    {
        if ( buffer[i].slice(-4) == "m3u8" )
        {
                url = parser_url(url,buffer,i);
               request_second_m3u8(url);
                return 0;    //break ABR
        }
    }
}

let duplication_eliminater = (array_1, array_2) =>
{
  array_1 = array_1.concat(array_2);
  array_1 = new Set(array_1);
  return Array.from(array_1); 
}

let request_live_m3u8 = (url) =>
{
    axios.get(url)
  .then( (response) => 
  {
       // logger_time(id);
        logger(response.status + " " + response.config.url);
        console.log( response.status + " " + response.config.url);
        buffer = response.data.split("\n");
        buffer = buffer[buffer.length-2];
        buffer = parser_url(url,buffer,0);
  })
  .catch( (error) => {
      logger(error);
    console.log(error);
  });
}


let startInterval = (callback, x, time, immediate) => 
{
    let stop = setInterval( () => 
    {
        callback(x, stop) 
    }
    , time );

    if(immediate == 'immediate')
    {
      callback(x,  stop);
    }
}

let request_ts_live = (id) =>
{
  axios.get( buffer )
  .then( (response) => 
  {
      console.log(id + " " + response.status + " " + response.config.url );
      logger(response.status + " " + response.config.url , id);
  })
  .catch( (error) => {
    console.log(id + " " + error);
    logger(error, id);
  });
}


let request_ts_vod = (id, stop )=>
{
    axios.get( buffer[ n[id] ] )
     .then( (response) => 
     {
       // console.log(id + " " + response.status + " " + response.config.url );
        // logger(response.status + " " + response.config.url , id);
     })
    .catch( (error) => {
      console.log(id + " " + error);
      logger(error, id);
    })
    .then();

    n[id]++;
    // only for vod 
    if(n[id]==buffer.length)
    {
        clearInterval(stop);
        n[id]=0;
    }
}

let logger = (url, id) => 
{
  let time = new Date();
  let hour = time.getHours();
  let mininute = time.getMinutes();
  let second = time.getSeconds();
  //time = mininute.concat( ' : ', second);
  time =  hour + ' : ' + mininute + ' : ' + second;

  if ( typeof(id) == 'undefined')
  {
    fs.appendFile('request.log', url + " " + time + "\n" , 'utf-8', function(e)
    {
        if(e){
            console.log(e);
        }else{
        }
    });
  }
  else
  {
    fs.appendFile('request.log', id + " " + url + ' ' + time +  "\n" , 'utf-8', function(e)
    {
        if(e){
            console.log(e);
        }else{
        }
    });
  }
    
}

request_first_m3u8(base_url);