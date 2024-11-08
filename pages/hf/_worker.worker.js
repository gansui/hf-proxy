const target = 'https://huggingface.co'
const target_site = 'huggingface.co'
const cdn_target = 'https://cdn-lfs'
const cdn_proxy = 'https://ghget.woodhub.us.kg/xdfxdg/'
//const cdn_proxy = 'https://facebook.woodhub.us.kg'
//const cdn_proxy = 'hf-mirror.pages.dev'
//var s3_proxy = 'https://ghget.woodhub.us.kg/xdfxdg/'
var s3_proxy = ''

const allowMethods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

const allowHeaders = [
  'Accept',
  'Accept-Encoding',
  'Authorization',
  'Content-Type',
  'Origin',
  'User-Agent',
]


const exposeHeaders = [
  'Content-Length',
  'Content-Type',
  'Date',
  'Server',
  'ETag',
  'Content-Range',
  'Accept-Ranges',
  'Link',
  'X-Request-Id',
  'X-Error-Code',
  'X-Error-Message',
  'X-Total-Count',
  'X-Repo-Commit',
  'X-Linked-Etag',
  'X-Linked-Size',      
]

async function handleRequest(request) {
  const url = new URL(request.url)
  const method = request.method

  if (!allowMethods.includes(method)) {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let proxyRequest = new Request(target + url.pathname + url.search , request)

  proxyRequest.headers.set('Host', target_site)
  proxyRequest.headers.set('Authority', target_site)
  proxyRequest.headers.set('Referer', target)
  if(request.method === 'HEAD') {
    proxyRequest.headers.set('Accept-Encoding', 'identity')
  } else {
    proxyRequest.headers.set('Accept-Encoding', 'gzip')
  }

  let response = await fetch(proxyRequest)

  //for Debug
  if(request.method === 'PHEAD'){
    let debug_url = target + url.pathname + url.search

    const requestData = {
      method: request.method,
      url: request.url,
      headers: {},
      body: null
    };

    const headers = request.headers;
    for (const key of headers.keys()) {
      requestData.headers[key] = headers.get(key);
    }

    let myresponse = new Response('HEAD, Cloudflare Worker!', {
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  
    // 添加一个新的头信息
    myresponse.headers.set('X-Authority', response.headers.get('Content-Length'));
    myresponse.headers.set('X-Url', debug_url);
    myresponse.headers.set('X-debug', JSON.stringify(requestData));

    // 返回响应
    return myresponse;
  }


  if (response.status === 302) {
    const location = response.headers.get('Location')
    if (location && location.startsWith(cdn_target)) {
      response = new Response(response.body, response)
      const locationArray = location.split(".");
      const subdomain = locationArray[0].replace("https://", "");
      const newLocation = `${cdn_proxy}/${location}`; 
      const realDomain = `https://${subdomain}.huggingface.co`
      response.headers.set(
        'Location',
        newLocation
        //location.replace(realDomain, newLocation)
      )
    }
  }


  let proxyResponse = new Response(response.body, response)
  proxyResponse.headers.set('Access-Control-Allow-Origin', url.origin)
  proxyResponse.headers.set(
    'Access-Control-Allow-Methods',
    allowMethods.join(',')
  )
  proxyResponse.headers.set(
    'Access-Control-Allow-Headers',
    allowHeaders.join(',')
  )
  proxyResponse.headers.set(
    'Access-Control-Expose-Headers',
    exposeHeaders.join(',')
  )

  return proxyResponse
}

export default{
  async fetch(request, env) {
    return handleRequest(request)
  }
}
