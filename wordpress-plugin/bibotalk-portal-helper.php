<?php
/**
 * Plugin Name: Bibotalk Portal Helper
 * Description: Expõe o enclosure/artwork do PowerPress, o status de "vídeo pendente" e a URL do vídeo na REST API, para uso do portal de upload do Bibotalk.
 * Version: 1.1.0
 * Author: Bibotalk
 *
 * Instalação: copie este arquivo para wp-content/plugins/ (ou crie a pasta
 * wp-content/plugins/bibotalk-portal-helper/ e coloque-o dentro) e ative o
 * plugin no painel do WordPress.
 */

if (!defined('ABSPATH')) {
    exit;
}

const BIBOTALK_PP_FIELD = 'bibotalk_powerpress';

/**
 * O PowerPress lê o post meta `enclosure` no formato:
 *   url \n tamanho \n mime-type \n serialize(array extra)
 * onde o array extra carrega duração e a imagem do episódio.
 */
function bibotalk_parse_enclosure($post_id) {
    $raw = get_post_meta($post_id, 'enclosure', true);
    if (!$raw) {
        return null;
    }
    $parts = explode("\n", $raw, 4);
    $extra = array();
    if (!empty($parts[3])) {
        $maybe = @unserialize(trim($parts[3]));
        if (is_array($maybe)) {
            $extra = $maybe;
        }
    }
    return array(
        'url'       => trim($parts[0]),
        'file_size' => isset($parts[1]) ? (int) trim($parts[1]) : 0,
        'mime_type' => isset($parts[2]) ? trim($parts[2]) : 'audio/mpeg',
        'duration'  => isset($extra['duration']) ? $extra['duration'] : '',
        'image'     => isset($extra['image']) ? $extra['image'] : (isset($extra['itunes_image']) ? $extra['itunes_image'] : ''),
    );
}

function bibotalk_write_enclosure($value, $post) {
    if (!is_array($value) || empty($value['url'])) {
        return;
    }

    $url       = esc_url_raw($value['url']);
    $file_size = isset($value['file_size']) ? (int) $value['file_size'] : 0;
    $mime_type = isset($value['mime_type']) ? sanitize_text_field($value['mime_type']) : 'audio/mpeg';
    $duration  = isset($value['duration']) ? sanitize_text_field($value['duration']) : '';
    $image     = isset($value['image']) ? esc_url_raw($value['image']) : '';

    // Preserva chaves extras que o PowerPress já tenha gravado neste post.
    $extra = array();
    $raw   = get_post_meta($post->ID, 'enclosure', true);
    if ($raw) {
        $parts = explode("\n", $raw, 4);
        if (!empty($parts[3])) {
            $maybe = @unserialize(trim($parts[3]));
            if (is_array($maybe)) {
                $extra = $maybe;
            }
        }
    }

    if ($duration !== '') {
        $extra['duration'] = $duration;
    }
    if ($image !== '') {
        // O PowerPress usa 'image' para a imagem do episódio (iTunes/Spotify).
        $extra['image']        = $image;
        $extra['itunes_image'] = $image;
    }

    $meta = $url . "\n" . $file_size . "\n" . $mime_type . "\n" . serialize($extra);
    update_post_meta($post->ID, 'enclosure', $meta);
}

add_action('rest_api_init', function () {
    register_rest_field('post', BIBOTALK_PP_FIELD, array(
        'get_callback' => function ($post_arr) {
            return bibotalk_parse_enclosure($post_arr['id']);
        },
        'update_callback' => 'bibotalk_write_enclosure',
        'schema' => array(
            'description' => 'Enclosure do PowerPress (mp3, tamanho, duração e artwork do episódio).',
            'type'        => array('object', 'null'),
            'properties'  => array(
                'url'       => array('type' => 'string'),
                'file_size' => array('type' => 'integer'),
                'mime_type' => array('type' => 'string'),
                'duration'  => array('type' => 'string'),
                'image'     => array('type' => 'string'),
            ),
        ),
    ));
});

add_action('init', function () {
    register_post_meta('post', 'bibotalk_video_pending', array(
        'show_in_rest'  => true,
        'single'        => true,
        'type'          => 'boolean',
        'default'       => false,
        'auth_callback' => function () {
            return current_user_can('edit_posts');
        },
    ));

    // URL de download do vídeo (Drive/WeTransfer etc.) pra quem for subir no Spotify
    register_post_meta('post', 'bibotalk_video_url', array(
        'show_in_rest'      => true,
        'single'            => true,
        'type'              => 'string',
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
        'auth_callback'     => function () {
            return current_user_can('edit_posts');
        },
    ));
});
