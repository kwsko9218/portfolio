window.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('header');
  //ヘッダーの高さを取得
  const updateHeaderHeight = () => {
    headerHeight = header ? header.offsetHeight : 0;
  };

  //イベント頻度調整
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }

  //スクロールバーの幅を取得してCSS変数にセット
  function observeScrollbarWidth() {
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--scrollbar-width', `${scrollBarWidth}px`);
  }

  /*loadイベント*/
  window.addEventListener('load', () => {
    observeScrollbarWidth();
    updateHeaderHeight();

    /*スムーススクロール*/
    {
      const smoothScroll = (targetId) => {
        const target = document.getElementById(targetId);
        if (!target) {
          console.error('アンカー対象なし：', targetId);
          return;
        }
        const targetPosition = window.scrollY + target.getBoundingClientRect().top - headerHeight;
        const supportsSmoothScroll = 'scrollBehavior' in document.documentElement.style;
        if (supportsSmoothScroll) {
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth',
          });
        } else {
          window.scrollTo(0, targetPosition);
        }
      };
      // 内部リンクのクリックイベント処理
      const links = document.querySelectorAll('a[href^="#"]');
      links.forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const hash = decodeURIComponent(link.hash);
          smoothScroll(hash.substring(1));
        });
      });
      // ページ読み込み時のアンカーへのスムーススクロール
      const hash = window.location.hash;
      if (hash) {
        window.scrollTo({ top: 0 });
        requestAnimationFrame(() => {
          smoothScroll(hash.substring(1));
        });
      }
    }

    /*表示位置によってヘッダーのスタイルを変更*/
    {
      const activateClassName = 'js-header-scrolled';
      const intersect = document.getElementById('bottom');
      const windowHeight = window.innerHeight;
      const rootMarginBottom = (1 - headerHeight / windowHeight) * -100 + '%';
      const options = {
        rootMargin: '0% 0% ' + rootMarginBottom + ' 0%',
      };
      const observer = new IntersectionObserver(doWhenHeaderIntersect, options);
      function doWhenHeaderIntersect(entries) {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            header.classList.add(activateClassName);
          } else {
            header.classList.remove(activateClassName);
          }
        });
      }
      observer.observe(intersect);
    }
  });

  /*resizeイベント*/
  window.addEventListener('resize', () => {
    debounce(observeScrollbarWidth, 1000);
    debounce(updateHeaderHeight, 1000);
  });

  /*表示位置によって対応するグローバルナビゲーションのスタイルを変更*/
  {
    const activateClassName = 'js-current-link';
    const targets = document.querySelectorAll('[data-info="target-section"]');
    const options = {
      rootMargin: '-50% 0px',
    };
    const observer = new IntersectionObserver(doWhenSectionIntersect, options);
    function doWhenSectionIntersect(entries) {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activateLink(entry.target);
        }
      });
    }
    function activateLink(element) {
      const currentActiveLink = document.querySelector(`.${activateClassName}`);
      if (currentActiveLink !== null) {
        currentActiveLink.classList.remove(activateClassName);
      }
      const newActiveLink = document.querySelector(`a[href='#${element.id}']`);
      newActiveLink.classList.add(activateClassName);
    }
    targets.forEach((target) => {
      observer.observe(target);
    });
  }

  /*表示位置をトリガーにスキルレベルを表示*/
  {
    const activateClassName = 'js-show-skill-level';
    const skillItems = document.querySelectorAll('.skills__item');
    const options = {
      rootMargin: '-25% 0px',
    };
    const observer = new IntersectionObserver(doWhenSkillItemIntersect, options);
    function doWhenSkillItemIntersect(entries) {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(activateClassName);
        }
      });
    }
    skillItems.forEach((skillItem) => {
      observer.observe(skillItem);
    });
  }

  /*表示位置に応じてコンテンツを表示*/
  {
    const targetState = 'true';
    const targets = document.querySelectorAll('[data-visible="false"]');
    const options = {
      rootMargin: '-25% 0px',
    };
    const observer = new IntersectionObserver(doWhenContentsIntersect, options);
    function doWhenContentsIntersect(entries) {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.dataset.visible = targetState;
        }
      });
    }
    targets.forEach((target) => {
      observer.observe(target);
    });
  }

  /*モーダル表示*/
  {
    const showClassName = 'js-modal-show';
    const hideClassName = 'js-modal-hide';
    const scrollLockClassName = 'js-scroll-lock';
    const body = document.body;
    //モーダルを表示する処理
    function openModal(modalTrigger) {
      const modalId = modalTrigger.dataset.modalId;
      const modal = document.getElementById(modalId);
      modal.classList.add(showClassName);
      body.classList.add(scrollLockClassName);
    }
    //モーダルを閉じる処理
    function closeModal(modal) {
      modal.classList.add(hideClassName);
      setTimeout(() => {
        modal.classList.remove(showClassName, hideClassName);
        body.classList.remove(scrollLockClassName);
      }, 300);
    }
    //モーダルを表示するイベント登録
    const modalTriggers = document.querySelectorAll('.works__button');
    modalTriggers.forEach((modalTrigger) => {
      //画像クリックでモーダルを表示する
      modalTrigger.addEventListener('click', () => {
        openModal(modalTrigger);
      });
      //Enterキーでモーダルを表示する
      modalTrigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          openModal(modalTrigger);
        }
      });
    });
    //閉じるボタンクリックでモーダルを閉じる
    const closeButtons = document.querySelectorAll('.modal__button');
    closeButtons.forEach((closeButton) => {
      closeButton.addEventListener('click', () => {
        const modal = closeButton.closest('.modal');
        closeModal(modal);
      });
    });
    //背景クリックでモーダルを閉じる
    const modals = document.querySelectorAll('.modal');
    modals.forEach((modal) => {
      modal.addEventListener('click', (e) => {
        const modalContainer = modal.querySelector('.modal__container');
        if (e.target === modal || e.target === modalContainer) {
          closeModal(modal);
        }
      });
    });
  }

  /*モーダルサムネイル処理*/
  {
    const activateClassName = 'js-thumbnail-active';
    const modals = document.querySelectorAll('.modal');
    //大きな画像を切り替える処理
    function changeLargeImage(thumbnail, container) {
      container.innerHTML = '';
      const figure = thumbnail.querySelector('.project__figure');
      if (figure) {
        const clone = figure.cloneNode(true);
        const tabIndexedElements = clone.querySelectorAll('[tabindex]');
        tabIndexedElements.forEach((e) => {
          e.removeAttribute('tabindex');
        });
        container.appendChild(clone);
      }
    }
    //サムネイルをアクティブにする処理
    function activateThumbnail(thumbnail, modal, largeImageContainer) {
      const activeThumbnail = modal.querySelector(`.${activateClassName}`);
      if (activeThumbnail !== thumbnail) {
        activeThumbnail.classList.remove(activateClassName);
        thumbnail.classList.add(activateClassName);
        changeLargeImage(thumbnail, largeImageContainer);
      }
    }
    modals.forEach((modal) => {
      const thumbnails = modal.querySelectorAll('.project__thumbnail');
      const largeImageContainer = modal.querySelector('.project__large-image-wrap');
      thumbnails.forEach((thumbnail, index) => {
        //最初のサムネイルをアクティブにする
        if (index === 0) {
          thumbnail.classList.add(activateClassName);
          changeLargeImage(thumbnail, largeImageContainer);
        }
        //クリックで画像を切り替える
        thumbnail.addEventListener('click', () => {
          activateThumbnail(thumbnail, modal, largeImageContainer);
        });
        //Enterキーで画像を切り替える
        thumbnail.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            activateThumbnail(thumbnail, modal, largeImageContainer);
          }
        });
      });
    });
  }

  /*フォーム処理*/
  {
    const form = document.getElementById('form');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const commentInput = document.getElementById('comment');
    const submitButton = document.getElementById('submit');
    // フォームバリデーション
    function formValidate(name, email, comment) {
      const errors = [];
      const rules = {
        name: {
          required: true,
          maxLength: 30,
          message: 'お名前を入力してください。',
          maxLengthMessage: 'お名前は30文字以内で入力してください。',
        },
        email: {
          required: true,
          maxLength: 50,
          message: 'メールアドレスを入力してください。',
          maxLengthMessage: 'メールアドレスは50文字以内で入力してください。',
        },
        comment: {
          required: true,
          maxLength: 300,
          message: 'コメントを入力してください。',
          maxLengthMessage: 'コメントは300文字以内で入力してください。',
        },
      };
      for (const field in rules) {
        const value = { name, email, comment }[field];
        const { required, maxLength, message, maxLengthMessage } = rules[field];
        if (required && !value) {
          errors.push(message);
        } else {
          if (field === 'email') {
            const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            const emailPatternMessage = 'メールアドレスの形式が不正です。';
            if (!emailPattern.test(email)) {
              errors.push(emailPatternMessage);
            }
          }
          if (maxLength && value.length >= maxLength) {
            errors.push(maxLengthMessage);
          }
        }
      }
      return errors.join('\n');
    }
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      submitButton.disabled = true;
      submitButton.value = '送信中...';
      //入力値の取得
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const comment = commentInput.value.trim();
      //サニタイジング
      const sanitizedName = DOMPurify.sanitize(name);
      const sanitizedEmail = DOMPurify.sanitize(email);
      const sanitizedComment = DOMPurify.sanitize(comment);
      console.log(sanitizedName, sanitizedEmail, sanitizedComment);
      //バリデーション
      const validateError = formValidate(sanitizedName, sanitizedEmail, sanitizedComment);
      if (validateError) {
        alert(validateError);
        submitButton.disabled = false;
        submitButton.value = '送信';
        return;
      }
      //サーバーに送信
      try {
        const response = await fetch('/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: sanitizedName,
            email: sanitizedEmail,
            comment: sanitizedComment,
          }),
        });
        const result = await response.json();
        if (response.ok) {
          alert(result.message);
          form.reset();
        } else {
          alert(result.error);
        }
      } catch (error) {
        console.error('リクエスト中に問題が発生しました:', error);
        alert('クエスト中に問題が発生しました。\n再度お試しください。');
      } finally {
        submitButton.disabled = false;
        submitButton.value = '送信';
      }
    });
  }
});
