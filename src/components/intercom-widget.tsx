'use client'

import Script from 'next/script'

const INTERCOM_APP_ID = 'ywacu6am'

/**
 * Intercom Messenger widget.
 * Loads the Intercom script and boots the messenger on every page.
 * Drop this into the root layout alongside GoogleAdsScript.
 */
export function IntercomWidget() {
  return (
    <Script id="intercom-init" strategy="afterInteractive">
      {`
        window.intercomSettings = {
          api_base: "https://api-iam.intercom.io",
          app_id: "${INTERCOM_APP_ID}"
        };
        (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/${INTERCOM_APP_ID}';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onLoad',l);}else{w.addEventListener('load',l,false);}}})();
      `}
    </Script>
  )
}
