// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/hello_world

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    
    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid url' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch the webpage
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    })

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const html = await res.text()

    // Helper function to extract meta tags
    const pickMeta = (names: string[]) => {
      for (const name of names) {
        const regex = new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')
        const match = html.match(regex)
        if (match) return match[1]
      }
      return null
    }

    // Extract metadata
    const title = pickMeta(['og:title']) || 
                  html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || 
                  null
    
    const description = pickMeta(['og:description', 'description']) || null
    const image = pickMeta(['og:image', 'twitter:image']) || null
    const siteName = pickMeta(['og:site_name']) || null

    return new Response(
      JSON.stringify({ 
        title, 
        description, 
        image, 
        siteName, 
        url 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
