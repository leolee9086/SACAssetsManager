export const completionEndpoint = '/chat/completions'
export const getChatCompletionsEndpoint = (base_url) => {
    return base_url.endsWith('/')?base_url+completionEndpoint:base_url+'/'+completionEndpoint
}


