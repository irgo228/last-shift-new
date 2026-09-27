'use client';
import {useEffect,useRef,useState} from 'react';

/** Visual-only diagram zoom: never pauses or alters the server's question deadline. */
export default function ZoomableDiagram({src,alt,mode='host'}) {
  const [open,setOpen]=useState(false);
  const [scale,setScale]=useState(1);
  const [naturalWidth,setNaturalWidth]=useState(1500);
  const scroller=useRef(null);
  const drag=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const onKey=e=>{if(e.key==='Escape')setOpen(false);};
    const oldOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    window.addEventListener('keydown',onKey);
    return()=>{document.body.style.overflow=oldOverflow;window.removeEventListener('keydown',onKey);};
  },[open]);
  useEffect(()=>{setOpen(false);setScale(1);},[src]);
  const changeScale=next=>setScale(Math.min(3,Math.max(0.75,Number(next.toFixed(2)))));
  const beginDrag=e=>{
    if(e.pointerType!=='mouse'||e.button!==0||!scroller.current)return;
    drag.current={x:e.clientX,y:e.clientY,left:scroller.current.scrollLeft,top:scroller.current.scrollTop};
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveDrag=e=>{
    if(!drag.current||!scroller.current)return;
    scroller.current.scrollLeft=drag.current.left-(e.clientX-drag.current.x);
    scroller.current.scrollTop=drag.current.top-(e.clientY-drag.current.y);
  };
  return <>
    <button type="button" className={mode==='host'?'stage-image-button':'image-tap'} onClick={()=>{setOpen(true);setScale(1);}} aria-label={`Увеличить: ${alt}`}>
      <img src={src} alt={alt} className={mode==='host'?'stage-image':'player-diagram-image'} loading="eager"/>
      <span className={mode==='host'?'zoom-hint':'player-zoom-hint'}>⌕ Увеличить схему</span>
    </button>
    {open&&<div className="diagram-modal" role="dialog" aria-modal="true" aria-label={`Увеличенная схема: ${alt}`}>
      <div className="diagram-tools">
        <span>Прокрутите схему, чтобы рассмотреть детали</span>
        <button type="button" onClick={()=>changeScale(scale/1.25)} aria-label="Уменьшить масштаб">−</button>
        <output aria-live="polite">{Math.round(scale*100)}%</output>
        <button type="button" onClick={()=>changeScale(scale*1.25)} aria-label="Увеличить масштаб">+</button>
        <button type="button" className="diagram-close" onClick={()=>setOpen(false)}>✕ Закрыть</button>
      </div>
      <div ref={scroller} className="diagram-viewport" tabIndex={0} aria-label="Прокручиваемая технологическая схема">
        <div className="diagram-pan" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
          <img src={src} alt={alt} onLoad={e=>setNaturalWidth(e.currentTarget.naturalWidth||1500)} style={{width:Math.round(Math.max(1200,naturalWidth)*scale)+'px'}} draggable={false}/>
        </div>
      </div>
    </div>}
  </>;
}
