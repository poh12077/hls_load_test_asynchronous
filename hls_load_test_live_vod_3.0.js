axios = require('axios');
let fs = require('fs');

const base_url = 'https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,640x360_1000,950x540_1500,.f4v.csmil/master.m3u8';
//const base_url = 'https://cph-msl.akamaized.net/hls/live/2000341/test/master.m3u8';  //akamai live
//const base_url = 'http://192.168.0.124:1935/live/nana/playlist.m3u8';   //live   
//const base_url = 'http://192.168.0.124:1935/vod/mp4:sample.mp4/playlist.m3u8';   //vod

let buffer=[];
let ts_duration = 1000;
let load=2;
let n = new Array(load);    //for request_ts_vod_fast
n.fill(0);

let parser_url = (url,buffer,i) =>
{
   url = url.split('/');  //string to array
   url.pop();
   buffer = buffer[i].split('/'); // string to array
   
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
  axios.get(url)
  .then( (response) => 
  {
       // logger_time(id);
        //logger_request(response.status + " " + response.config.url, id);
        console.log( response.status + " " + response.config.url);
        buffer = response.data.split("\n");
        parser_m3u8(buffer, url);
  
  })
  .catch( (error) => {
      //logger_request(error, id);
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
       // logger_time(id);
        //logger_request(response.status + " " + response.config.url, id);
        console.log( response.status + " " + response.config.url);
        buffer = response.data.split("\n");
        if( buffer[ buffer.length-2 ] == '#EXT-X-ENDLIST')
       {
           buffer = buffer_cleaner(buffer);

            for(let i=0;i<buffer.length;i++)
            {
              buffer[i] = parser_url(url,buffer,i);
            }
           
            startInterval(request_ts_vod, 0 , ts_duration);
       }
       else
       {
            buffer = buffer_cleaner(buffer);
            
            for(let i=0;i<buffer.length;i++)
            {
              buffer[i] = parser_url(url,buffer,i);
            }

            startInterval(request_live_m3u8, url, ts_duration);
            startInterval(request_ts_live, 0, ts_duration);
       }
  })
  .catch( (error) => {
      //logger_request(error, id);
    console.log(error);
  });
}



let parser_m3u8 = (buffer, url) => 
{
    for (let i=0;i<buffer.length;i++)
    {
        if ( buffer[i].slice(-4) == "m3u8" )
        {
                url = parser_url(url,buffer,i);
               // startInterval(request_first_m3u8, url, ts_duration );
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
    let m3u8=[];
    axios.get(url)
  .then( (response) => 
  {
       // logger_time(id);
        //logger_request(response.status + " " + response.config.url, id);
        console.log( response.status + " " + response.config.url);
        m3u8 = response.data.split("\n");
        m3u8 = buffer_cleaner(m3u8);
       
        for(let i=0;i<m3u8.length;i++)
        {
          m3u8[i] = parser_url(url,m3u8,i);
        }

        buffer = duplication_eliminater(buffer,m3u8);
  })
  .catch( (error) => {
      //logger_request(error, id);
    console.log(error);
  });
}

let startInterval = (callback, x, ts_duration ) => 
{
    let stop = setInterval( () => 
    {
        callback(x, stop) 
    }
    , ts_duration );

    callback(x,  stop);
}

let request_ts_live = (id) =>
{
  if(n[id]>=buffer.length)
  {
    console.log(id + " " + "wait for new ts file");
    return;
  }

  axios.get( buffer[ n[id] ] )
  .then( (response) => 
  {
      console.log(id + " " + response.status + " " + response.config.url );
     // logger_request(response.status + " " + ts_url , id);
  })
  .catch( (error) => {
    console.log(id + " " + error);
    //logger_request(error, id);
  })
  .then();

  n[id]++;
  // only for vod 
}

let request_ts_vod = (id, stop )=>
{
    axios.get( buffer[ n[id] ] )
    .then( (response) => 
    {
        console.log(id + " " + response.status + " " + response.config.url );
       // logger_request(response.status + " " + ts_url , id);
    })
    .catch( (error) => {
      console.log(id + " " + error);
      //logger_request(error, id);
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

request_first_m3u8(base_url);

