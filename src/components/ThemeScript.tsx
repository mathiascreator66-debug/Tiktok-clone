/** Inline before paint — default light, honor cookie/localStorage. */
export default function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('afrivoix_theme');if(t!=='light'&&t!=='dark'){var m=document.cookie.match(/(?:^|; )afrivoix_theme=(light|dark)/);t=m?m[1]:'light';}var d=t==='dark';document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.classList.remove('dark');document.documentElement.dataset.theme='light';}})();`;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
