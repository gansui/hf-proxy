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
  //如果是HEAD则设置Accept-Encoding,否则HEAD有可能无法返回Content-Length导致错误
  if(request.method === 'HEAD') {
    proxyRequest.headers.set('Accept-Encoding', 'identity')
    //proxyRequest.headers.set('User-Agent', 'curl/7.88.1')
    //proxyRequest.headers.set('Accept-Ranges', 'bytes')
    //proxyRequest.headers.set('Cache-Control', 'no-transform')
    proxyRequest.headers.set('Cache-Control', 'no-transform, no-cache, no-store, must-revalidate')
    proxyRequest.headers.set('Pragma', 'no-cache')
    proxyRequest.headers.set('Expires', '0')
    let head_response = await fetch(proxyRequest)

    if(head_response.headers.has("X-Linked-Size")){
        head_response.headers.set("Content-Length",head_response.headers.get("X-Linked-Size"))
    }

    return head_response
  }

  let response = await fetch(proxyRequest)

  /*for Debug
  if(request.method === 'HEAD'){
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
*/

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

/*如果不注释掉这一段，它会把下载的内容里的https://huggingface.co替换成代理主机域名，会导致误修改，比如README.MD中部分内容被修改，下载后的文件内容和原文件长度不一致，导致huggingface_cli执行失败
  let contentType = response.headers.get('content-type')

  if (contentType && (contentType.includes('text') || contentType.includes('json'))) {
    let text = await response.text()
    let domain = new URL(request.url).hostname
    text = text.replace(/https:\/\/huggingface\.co/g, 'https://' + domain)
    if (s3_proxy != ""){
      text = text.replace(/https:\/\/s3\.amazonaws\.com/g, s3_proxy)
    }
    response = new Response(text, response)
  }
*/
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
