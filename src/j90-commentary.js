/* Jornada 90 Commentary 1.0
 * Deterministic, offline event-to-text commentary inspired by the architecture
 * documented by Global Soccer Manager (Apache-2.0). No source code or phrase
 * bank is copied. This implementation is original and adapted to Jornada 90.
 */
(function(){
  'use strict';
  if(window.J90Commentary)return;

  var esc=function(v){return String(v==null?'':v)};
  var pick=function(m,list){
    var seed=(m._j90CommentarySeed=(Math.imul(1664525,(Number(m._j90CommentarySeed)||123456789)>>>0)+1013904223)>>>0);
    return list[seed%list.length];
  };
  var findPlayer=function(m,name){
    if(!name)return null;
    var all=(m&&m.players||[]).concat(m&&m.oppPlayers||[]);
    var n=String(name).toLowerCase();
    for(var i=0;i<all.length;i++){
      if(all[i]&&String(all[i].name||'').toLowerCase()===n)return all[i];
    }
    return null;
  };
  function describe(m,text){
    var raw=esc(text),n=raw.toLowerCase(),p=findPlayer(m,(raw.match(/([A-ZÀ-Ý][\wÀ-ÿ.'-]+(?:\s+[A-ZÀ-Ý][\wÀ-ÿ.'-]+){0,2})/)||[])[1]);
    var name=p&&p.name?p.name:null;
    if(/gol|goooo|marcou/.test(n))return pick(m,[
      'GOOOOOOL! '+(name||'A equipe')+' encontra o caminho das redes!',
      'É GOL! '+(name||'O ataque')+' finaliza e muda o placar!',
      'GOOOOOL! Uma jogada que termina do jeito que a torcida queria!'
    ]);
    if(/cartão amarelo|amarelo/.test(n))return pick(m,[
      'Cartão amarelo. O árbitro pune a entrada e o jogo segue sob atenção.',
      'Amarelo mostrado. O duelo ficou mais intenso e o árbitro intervém.'
    ]);
    if(/vermelho|expuls/.test(n))return 'Cartão vermelho! O jogador deixa a partida e sua equipe fica com um desafio maior.';
    if(/pênalti|penalty/.test(n))return 'Pênalti! A decisão coloca a cobrança no centro das atenções.';
    if(/impedimento/.test(n))return 'Impedimento assinalado. O ataque foi bem construído, mas a linha defensiva acertou o tempo.';
    if(/lesão|lesion/.test(n))return 'O jogo para para atendimento. Esperamos que '+(name||'o jogador')+' possa voltar em segurança.';
    if(/defesa|goleiro|save/.test(n))return pick(m,[
      'Boa defesa! O goleiro aparece bem e mantém a partida viva.',
      'Defesa importante. O goleiro lê a jogada e evita o pior.'
    ]);
    if(/drible/.test(n))return pick(m,[
      (name||'O jogador')+' tenta o drible e parte para cima da marcação.',
      (name||'O jogador')+' encara o marcador. Boa iniciativa no duelo individual.'
    ]);
    if(/finaliza|finalização|chute|shot/.test(n))return 'Finalização! '+(name||'O atacante')+' arrisca e leva perigo ao gol.';
    if(/falta|foul/.test(n))return 'Falta marcada. O árbitro interrompe o duelo e a bola volta para a equipe que sofreu a infração.';
    return raw;
  }

  function wrap(){
    if(typeof window.mgrMatchEvent!=='function'||window.mgrMatchEvent.__j90CommentaryWrapped)return;
    var old=window.mgrMatchEvent;
    var wrapped=function(text){
      var m=window.S&&S.match2d;
      var line=m?describe(m,text):String(text||'');
      return old.call(this,line);
    };
    wrapped.__j90CommentaryWrapped=true;
    wrapped.__original=old;
    window.mgrMatchEvent=wrapped;
    try{mgrMatchEvent=wrapped}catch(e){}
  }

  window.J90Commentary={
    version:'1.0',
    sourceArchitecture:'Global Soccer Manager',
    license:'Apache-2.0',
    describe:describe,
    install:wrap
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wrap,{once:true});else wrap();
})();