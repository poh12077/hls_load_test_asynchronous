axios = require('axios');
let fs = require('fs');

const url = 'http://192.168.0.124:1935/live/nana/playlist.m3u8';   //live   
//const url = 'http://192.168.0.124:1935/vod/mp4:sample.mp4/playlist.m3u8';   //vod

let buffer=[];
let ts_duration = 15000;

let parser_url = (url,buffer,i) =>
{
   url = url.split('/');  //string to array
   url.pop();
   buffer = buffer[i].split('/'); // string to array
   
   url = url.concat(buffer);  
   url = new Set(url);
   url = Array.from(url); 

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
           return 0;
       }
       else
       {
            buffer = buffer_cleaner(buffer);
            startInterval(request_live_m3u8, url, ts_duration);
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
      buffer = buffer.concat(m3u8);

      buffer = new Set(buffer);
      buffer = Array.from(buffer); 
      
  })
  .catch( (error) => {
      //logger_request(error, id);
    console.log(error);
  });
}

let startInterval = (callback, url, ts_duration ) => 
{
    let stop = setInterval( () => 
    {
        callback(url, stop) 
    }
    , ts_duration );

    callback(url,  stop);
}

request_first_m3u8(url);