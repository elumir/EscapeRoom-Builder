import React from 'react';

interface IconProps {
  as: 'plus' | 'trash' | 'present' | 'prev' | 'next' | 'close' | 'reorder' | 'expand' | 'collapse' | 'lock' | 'eye' | 'eye-slash' | 'chevron-down' | 'restart' | 'rewind' | 'settings' | 'gallery' | 'audio' | 'map' | 'edit' | 'shuffle' | 'swatch' | 'share' | 'stop' | 'play' | 'font' | 'hand-expand' | 'description';
  className?: string;
}

const icons = {
  plus: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  trash: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  ),
  present: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <rect x=".75" y=".75" width="22.5" height="22.5" rx="1.5" ry="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.238 15.66A.856.856 0 0 1 9 14.894V9.106a.856.856 0 0 1 1.238-.766l5.789 2.895a.855.855 0 0 1 0 1.53z" />
    </svg>
  ),
  prev: (
     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  ),
  next: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  ),
  close: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  ),
  reorder: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
    </svg>
  ),
  expand: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  ),
  collapse: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9V4.5M15 9h4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25" />
      </svg>
  ),
  lock: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  ),
  eye: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  ),
  'eye-slash': (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243L6.228 6.228" />
    </svg>
  ),
  'chevron-down': (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  ),
  restart: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <circle cx="12" cy="11.998" r="11.25" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.284 7.964A1.591 1.591 0 0 1 12 9.089V10.5l2.534-2.534a1.591 1.591 0 0 1 2.716 1.123v5.819a1.592 1.592 0 0 1-2.716 1.125L12 13.5v1.41a1.592 1.592 0 0 1-2.716 1.125L5.25 12z" />
    </svg>
  ),
  rewind: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M22.075 3.011L14.25 7.875V3.629a.75.75 0 0 0-1.175-.618l-12 8.371a.75.75 0 0 0 0 1.236l12 8.371a.75.75 0 0 0 1.175-.618v-4.246l7.825 4.864a.75.75 0 0 0 1.175-.618V3.629a.75.75 0 0 0-1.175-.618z" />
    </svg>
  ),
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 48 48" strokeWidth="2" stroke="currentColor">
      <circle cx="24" cy="24" r="7" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M46,27V21L39.6,20.466a15.89,15.89,0,0,0-2.072-4.991l4.155-4.91L37.435,6.322l-4.91,4.155A15.876,15.876,0,0,0,27.534,8.4L27,2H21l-.534,6.4a15.89,15.89,0,0,0-4.991,2.072l-4.91-4.155L6.322,10.565l4.155,4.91A15.876,15.876,0,0,0,8.4,20.466L2,21v6l6.4.534a15.89,15.89,0,0,0,2.072,4.991l-4.155,4.91,4.243,4.243,4.91-4.155A15.876,15.876,0,0,0,20.466,39.6L21,46h6l.534-6.405a15.89,15.89,0,0,0,4.991-2.072l4.91,4.155,4.243-4.243-4.155-4.91A15.876,15.876,0,0,0,39.6,27.534Z" />
    </svg>
  ),
  gallery: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  audio: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.1 8.326a.716.716 0 0 0-.752.068L8.443 11.25H6.718a.717.717 0 0 0-.718.718v1.564a.717.717 0 0 0 .718.718h1.725l3.908 2.856a.718.718 0 0 0 1.149-.574V8.968a.717.717 0 0 0-.4-.642z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 14.218a2.071 2.071 0 0 0 0-3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M22.5 21.75a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5V2.25A1.5 1.5 0 0 1 3 .75h15a1.5 1.5 0 0 1 1.047.426l3 2.883a1.5 1.5 0 0 1 .453 1.074z" />
    </svg>
  ),
  map: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.307 2.838a1.5 1.5 0 0 0-1.114 0L8.807 5.393a1.5 1.5 0 0 1-1.114 0L1.779 3.027a.75.75 0 0 0-1.029.7V18.1a1.5 1.5 0 0 0 .943 1.393l6 2.4a1.5 1.5 0 0 0 1.114 0l6.386-2.555a1.5 1.5 0 0 1 1.114 0l5.914 2.362a.75.75 0 0 0 1.029-.7V6.631a1.5 1.5 0 0 0-.943-1.393z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 5.5V22" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 2.731v16.5" />
    </svg>
  ),
  edit: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  ),
  shuffle: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.667 0m-11.667 0-3.181 3.183m0-11.667a8.25 8.25 0 0 1 11.667 0m0 0h-4.992m4.992 0-3.181-3.183m-11.667-3.183a8.25 8.25 0 0 1 11.667 0m0 0v4.992m0 0-3.181-3.183" />
    </svg>
  ),
  swatch: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />
    </svg>
  ),
  share: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.29 14.34l-5.16.986" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.416 8.478l-3.468 1.146a1.151 1.151 0 0 1-1.405-.611 1.164 1.164 0 0 1 .529-1.53l3.359-1.689a2.343 2.343 0 0 1 1.861-.108l4.973 1.819" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.685 14.348H6.13l3.512 3.936A1.342 1.342 0 0 0 12 17.408v-.615l.175.07a1.656 1.656 0 0 0 2.271-1.537h.489a1.468 1.468 0 0 0 1.174-2.348L12.97 8.956" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.583 7.225l-.358-.295a2.1 2.1 0 0 0-1.245-.409 2.081 2.081 0 0 0-.779.151L3.75 8.452" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M.75 6.75h2a.961.961 0 0 1 1 .916v6.417a.962.962 0 0 1-1 .917h-2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M23.25 15h-2a.962.962 0 0 1-1-.917V7.666a.961.961 0 0 1 1-.916h2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.793l-.978-.978" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.446 15.326l-1.468-1.468" />
    </svg>
  ),
  stop: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
    </svg>
  ),
  play: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
  ),
  font: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5v15m0 0h13.5m-13.5 0L12 4.5" />
    </svg>
  ),
  'hand-expand': (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.863 20.258l-4.6-5.108a1.564 1.564 0 0 1-.139-1.913 1.564 1.564 0 0 1 2.105-.473L7.7 14.247 6.4 5.163A1.585 1.585 0 0 1 7.591 3.4a1.585 1.585 0 0 1 1.939 1.228L10.7 10.5V3.747a1.5 1.5 0 0 1 3 0V10.5l1.182-5.911a1.545 1.545 0 0 1 1.889-1.2 1.544 1.544 0 0 1 1.14 1.8L16.7 11.247l2.3-4.59a1.391 1.391 0 0 1 2.016-.536 1.392 1.392 0 0 1 .52 1.674l-2.259 5.648a4.491 4.491 0 0 0-.322 1.671v2.133a4.5 4.5 0 0 1-1.8 3.6 4.5 4.5 0 0 1-2.7.9h-3.247a4.5 4.5 0 0 1-3.345-1.489z" />
    </svg>
  ),
  'description': (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.477h6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 11.977h7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 16.477h13.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3.023a1.5 1.5 0 0 0-1.5 1.5v14.954a1.5 1.5 0 0 0 1.5 1.5h19.5a1.5 1.5 0 0 0 1.5-1.5v-12a1.5 1.5 0 0 0-.426-1.047l-2.883-2.955a1.5 1.5 0 0 0-1.074-.452z" />
    </svg>
  ),
};

const Icon: React.FC<IconProps> = ({ as, className = 'w-6 h-6' }) => {
  return <div className={className}>{icons[as]}</div>;
};

export default Icon;