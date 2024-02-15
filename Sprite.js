class Sprite {
  constructor(config) {

    //montar a imagem
    this.image = new Image();
    this.image.src = config.src;
    this.image.onload = () => {
      this.isLoaded = true;
    }

    //Shadow
    // this.shadow = new Image();
    // this.useShadow = true; //config.useShadow || false
    // if (this.useShadow) {
    //   this.shadow.src = "/images/characters/shadow.png";
    // }
    // this.shadow.onload = () => {
    //   this.isShadowLoaded = true;
    // }

    //configurando animaçoes do objeto e seu estado inicial
    this.animations = config.animations || {
      "idle-down" : [ [0,0] ],
      "idle-right": [ [0,1] ],
      "idle-up"   : [ [0,2] ],
      "idle-left" : [ [0,3] ],
      "walk-down" : [ [1,0],[0,0],[3,0],[0,0], ],
      "walk-right": [ [1,1],[0,1],[3,1],[0,1], ],
      "walk-up"   : [ [1,2],[0,2],[3,2],[0,2], ],
      "walk-left" : [ [1,3],[0,3],[3,3],[0,3], ]
    }
    this.currentAnimation = "idle-right"; // config.currentAnimation || "idle-down";
    this.currentAnimationFrame = 0;

    //quantidade de frames que cada sprite ocupará na animação --> permite uma animação ser mais rápida ou mais lenta
    this.animationFrameLimit = config.animationFrameLimit || 8;
    this.animationFrameProgress = this.animationFrameLimit;
    

    //referenciando o objeto do jogo
    this.gameObject = config.gameObject;
  }

  //getter dos frames da animação
  get frame() {
    return this.animations[this.currentAnimation][this.currentAnimationFrame]
  }

  //método que determina as animações para diferentes ações de movimentação
  setAnimation(key) {
    if (this.currentAnimation !== key) {
      this.currentAnimation = key;
      this.currentAnimationFrame = 0;
      this.animationFrameProgress = this.animationFrameLimit;
    }
  }

   //esse método é responsável por atualizar o progresso da animação do objeto
  updateAnimationProgress() {
    //diminuir o progresso
    if (this.animationFrameProgress > 0) {
      this.animationFrameProgress -= 1;
      return;
    }

    //resetar o contador da animação
    this.animationFrameProgress = this.animationFrameLimit;
    this.currentAnimationFrame += 1;

    //sempre retornar ao estado inicial da animação caso o objeto ultrapasse o limite ou tenha valor indefinido de animação
    if (this.frame === undefined) {
      this.currentAnimationFrame = 0
    }


  }
  
  //como os objetos serão desenhados
  draw(ctx, cameraPerson) {
    //posiciona o personagem em uma câmera centralizada, de forma que ele fique centralizado na tela do jogo. esse valores podem ser alterados posteriormente.
    const x = this.gameObject.x - 8 + utils.withGrid(10.5) - cameraPerson.x;
    const y = this.gameObject.y - 18 + utils.withGrid(6) - cameraPerson.y;

    this.isShadowLoaded && ctx.drawImage(this.shadow, x, y);


    const [frameX, frameY] = this.frame;

    this.isLoaded && ctx.drawImage(this.image,
      frameX * 32, frameY * 32,   //32 é o tamanho do sprite placeholder utilizado, PODE SER ALTERADO DEPOIS
      32,32,
      x,y,
      32,32
    )

    this.updateAnimationProgress();
  }

}